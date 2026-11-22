// The MAP tab's workspace: Montréal Island's landmark catalogue on a Google map.
//   * Map: @vis.gl/react-google-maps, framed on the island (panning loosely held there). Pins are
//     AdvancedMarkers, so the map needs a map ID: 'DEMO_MAP_ID' (Google's shared demo ID, no
//     cloud styling) until the project has its own.
//   * Data: every active landmark in the viewport (useLandmarksInView), re-queried 300 ms after
//     the map settles and whenever the page comes back into view (so new visits show).
//   * Selection lives in the URL (?landmark=<id or slug>), so the Gallery can deep-link here: the
//     landmark is fetched (even outside the viewport), selected and centred.
//   * No Maps key, or the API failed to load: a fallback note plus the full island list, so the
//     catalogue and the camera stay usable.
// The workspace fills the available height on every screen size (MapPage handles the columns).
import { APILoadingStatus, APIProvider, Map, useApiLoadingStatus, useMap, type MapEvent } from '@vis.gl/react-google-maps'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import Icon from '../../components/icons/Icon'
import { Mascot } from '../../components/illustrations/Mascot'
import { config } from '../../lib/config'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/theme'
import type { Bounds, LandmarkCategory, LandmarkDetail, LandmarkSummary } from '../explore/types'
import { DEFAULT_ZOOM, ISLAND_BOUNDS, ISLAND_LAT_LNG_BOUNDS, MONTREAL_CENTER, pathsBounds, polygonPaths, toBounds } from './geo'
import LandmarkList from './LandmarkList'
import LandmarkMarkers from './LandmarkMarkers'
import LandmarkSheet from './LandmarkSheet'
import LocateMe from './LocateMe'
import { NO_FILTER, applyFilter, filterCount, type MapFilter } from './filters'
import MapFilters from './MapFilters'
import MapLegend from './MapLegend'
import { GeofenceShape, UserLocation, type UserFix } from './MapOverlays'
import { useLandmarkDetail } from './useLandmarkDetail'
import { useLandmarksInView } from './useLandmarksInView'

const MAP_ID = config.googleMapsMapId
const IDLE_DEBOUNCE_MS = 300
/** Loosely holds panning to the island: you can drift past the edge, but not wander off. */
const RESTRICTION: google.maps.MapRestriction = { latLngBounds: ISLAND_LAT_LNG_BOUNDS, strictBounds: false }

export default function MapWorkspace({ className }: { className?: string }) {
  return (
    <section aria-label="Map" className={cn('relative flex min-h-[22rem] flex-1 overflow-hidden border-2 border-ink bg-teal-soft', className)}>
      {config.googleMapsApiKey ? (
        <APIProvider apiKey={config.googleMapsApiKey} region="CA" libraries={['marker']}>
          <WithMapsApi />
        </APIProvider>
      ) : (
        <Explorer withMap={false} reason="missing-key" />
      )}
    </section>
  )
}

function WithMapsApi() {
  const status = useApiLoadingStatus()
  const failed = status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE
  return failed ? <Explorer withMap={false} reason="load-failed" /> : <Explorer withMap />
}

/** A pending camera move: centre on a landmark, optionally zooming in to it. */
type Focus = { key: string; zoom: boolean }
type Panel = 'none' | 'filters' | 'list'

function Explorer({ withMap, reason }: { withMap: boolean; reason?: 'missing-key' | 'load-failed' }) {
  const [params, setParams] = useSearchParams()
  const selectedKey = params.get('landmark')

  // Without a map there's no viewport: list the whole island instead.
  const [viewport, setViewport] = useState<Bounds | null>(withMap ? null : ISLAND_BOUNDS)
  const data = useLandmarksInView(viewport)
  const selection = useLandmarkDetail(selectedKey, data.refreshToken)
  const [filter, setFilter] = useState<MapFilter>(NO_FILTER)
  const [panel, setPanel] = useState<Panel>(withMap ? 'none' : 'list')
  const [fix, setFix] = useState<UserFix | null>(null)

  // Deep links (and any later change of ?landmark= from outside) centre and zoom on the landmark.
  const [focus, setFocus] = useState<Focus | null>(selectedKey ? { key: selectedKey, zoom: true } : null)
  const [seenKey, setSeenKey] = useState(selectedKey)
  if (seenKey !== selectedKey) {
    setSeenKey(selectedKey)
    if (selectedKey && focus?.key !== selectedKey) setFocus({ key: selectedKey, zoom: true })
  }

  const detail = useMemo(
    () => (selection.detail && matches(selection.detail, selectedKey) ? selection.detail : null),
    [selection.detail, selectedKey],
  )
  const summary = useMemo(
    () => (selectedKey ? (data.landmarks.find((l) => matches(l, selectedKey)) ?? null) : null),
    [data.landmarks, selectedKey],
  )
  const selectedId = detail?.id ?? summary?.id ?? null

  const visible = useMemo(() => {
    const list = applyFilter(data.landmarks, filter)
    // A deep-linked landmark outside the viewport (or the filters) still gets its pin.
    return detail && !list.some((l) => l.id === detail.id) ? [...list, detail] : list
  }, [data.landmarks, filter, detail])

  const categories = useMemo(() => [...new Set(data.landmarks.map((l) => l.category))] as LandmarkCategory[], [data.landmarks])

  const select = useCallback(
    (l: LandmarkSummary, from: 'map' | 'list') => {
      setFocus({ key: l.id, zoom: from === 'list' })
      if (from === 'list' && withMap) setPanel('none')
      setParams(
        (p) => {
          p.set('landmark', l.id)
          return p
        },
        { replace: true },
      )
    },
    [setParams, withMap],
  )
  const clearFocus = useCallback(() => setFocus(null), [])
  const selectFromMap = useCallback((l: LandmarkSummary) => select(l, 'map'), [select])
  const selectFromList = useCallback((l: LandmarkSummary) => select(l, 'list'), [select])

  const close = () => {
    setFocus(null)
    setParams(
      (p) => {
        p.delete('landmark')
        return p
      },
      { replace: true },
    )
  }

  const sheetOpen = Boolean(selectedKey) && data.configured
  const filtered = filterCount(filter) > 0

  const notes = (
    <>
      {reason && <MapUnavailable reason={reason} />}
      {!data.configured && <Note tone="warn">The landmark catalogue isn’t connected yet (no backend configured), so there’s nothing to show.</Note>}
      {data.error && (
        <Note tone="warn" role="alert">
          Couldn’t load landmarks.{' '}
          <button type="button" onClick={data.retry} className="pointer-events-auto font-bold underline decoration-2 underline-offset-2">
            Try again
          </button>
        </Note>
      )}
      {data.loading && <Note>Loading landmarks…</Note>}
      {data.truncated && <Note>Lots of landmarks here. Zoom in to see them all.</Note>}
      {data.configured && !data.loading && !data.error && filtered && visible.length === 0 && (
        <Note>
          Nothing here matches your filters.{' '}
          <button type="button" onClick={() => setFilter(NO_FILTER)} className="pointer-events-auto font-bold underline decoration-2 underline-offset-2">
            Show all
          </button>
        </Note>
      )}
    </>
  )

  const filtersPanel = (
    <MapFilters value={filter} onChange={setFilter} available={categories} onClose={() => setPanel(withMap ? 'none' : 'list')} className="w-full" />
  )

  const listPanel = (
    <section
      aria-label={withMap ? 'Landmarks in view' : 'Landmarks on Montréal Island'}
      className={cn('sheet-grain flex w-full flex-col border-2 border-ink shadow-block-sm', withMap && 'max-h-full')}
    >
      <div className="flex min-h-12 items-center gap-2 border-b-2 border-ink py-1 pr-1 pl-3">
        <p className="eyebrow flex-1">
          {visible.length} {withMap ? 'in view' : 'on the island'}
        </p>
        {withMap && (
          <button type="button" onClick={() => setPanel('none')} aria-label="Close list" className="grid size-11 place-items-center hover:bg-saffron-soft">
            <Icon name="close" accent="none" strokeWidth={2.2} className="size-5" />
          </button>
        )}
      </div>
      <LandmarkList
        landmarks={visible}
        selectedId={selectedId}
        onSelect={selectFromList}
        empty={data.error ? 'Landmarks couldn’t be loaded.' : data.configured ? (withMap ? 'No landmarks in this part of the map. Try zooming out.' : 'No landmarks yet.') : 'The catalogue isn’t connected yet.'}
        className={cn(withMap && 'min-h-0 overflow-y-auto overscroll-contain')}
      />
    </section>
  )

  return (
    <>
      {withMap ? (
        <GoogleMap
          onViewport={setViewport}
          landmarks={visible}
          selectedId={selectedId}
          onSelect={selectFromMap}
          selected={detail}
          summary={summary}
          focus={focus}
          onFocused={clearFocus}
          fix={fix}
        />
      ) : (
        <div className="hatch-soft absolute inset-0" aria-hidden />
      )}

      {/* Top: legend, then the filter and list toggles. */}
      <div className="absolute inset-x-2 top-2 z-20 flex items-start gap-2">
        <MapLegend className="min-w-0 flex-1" />
        <ToolButton icon="tag" label="Filters" pressed={panel === 'filters'} badge={filterCount(filter)} onClick={() => setPanel(panel === 'filters' ? (withMap ? 'none' : 'list') : 'filters')} />
        {withMap && <ToolButton icon="clipboard" label="List" pressed={panel === 'list'} onClick={() => setPanel(panel === 'list' ? 'none' : 'list')} />}
      </div>

      <p className="sr-only" aria-live="polite">
        {data.configured && !data.loading ? `${visible.length} landmarks ${withMap ? 'in view' : 'on the island'}` : ''}
      </p>

      {withMap ? (
        <>
          {/* Status notes under the legend; filters or the list over the map's right side. */}
          <div className="pointer-events-none absolute top-14 left-2 z-10 flex max-w-[min(22rem,calc(100%-5rem))] flex-col items-start gap-2">{notes}</div>
          {panel !== 'none' && (
            <div className="absolute inset-x-2 top-14 bottom-2 z-20 flex flex-col sm:left-auto sm:w-[22rem]">
              {panel === 'filters' ? filtersPanel : listPanel}
            </div>
          )}
        </>
      ) : (
        // No map: one scrolling column with the explanation, the filters when open, and the list.
        <div className={cn('absolute inset-x-0 top-14 bottom-0 z-10 flex flex-col gap-2 overflow-y-auto px-2 pb-28 lg:pb-4', sheetOpen && 'lg:pl-[23.5rem]')}>
          <div className="flex flex-col items-start gap-2">{notes}</div>
          {panel === 'filters' && filtersPanel}
          {listPanel}
        </div>
      )}

      {/* Bottom right: zoom (laptops), locate me and the camera. Phones hide them under an open sheet. */}
      <div className={cn('absolute right-3 bottom-8 z-10 flex flex-col items-end gap-3', sheetOpen && 'max-lg:hidden')}>
        {withMap && <ZoomButtons />}
        {withMap && <LocateMe onFix={setFix} />}
        <Link
          to="/camera"
          className="day-island inline-flex min-h-14 items-center gap-2 border-2 border-ink bg-saffron px-4 font-sans text-sm font-bold tracking-[0.08em] text-ink uppercase shadow-block transition-colors hover:bg-ink hover:text-saffron active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <Icon name="camera" accent="sheet" className="size-6" />
          Camera
        </Link>
      </div>

      {sheetOpen && <LandmarkSheet {...selection} detail={detail} summary={summary} onClose={close} />}
    </>
  )
}

const matches = (l: { id: string; slug: string }, key: string | null) => key !== null && (l.id === key || l.slug === key)

// ---- The Google map -----------------------------------------------------------------------

type GoogleMapProps = {
  onViewport: (b: Bounds) => void
  landmarks: LandmarkSummary[]
  selectedId: string | null
  onSelect: (l: LandmarkSummary) => void
  selected: LandmarkDetail | null
  summary: LandmarkSummary | null
  focus: Focus | null
  onFocused: () => void
  fix: UserFix | null
}

function GoogleMap({ onViewport, landmarks, selectedId, onSelect, selected, summary, focus, onFocused, fix }: GoogleMapProps) {
  const { theme } = useTheme()
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Query the viewport once the map has been still for a moment.
  const onIdle = useCallback(
    (e: MapEvent) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const b = e.map.getBounds()
        if (b) onViewport(toBounds(b))
      }, IDLE_DEBOUNCE_MS)
    },
    [onViewport],
  )

  return (
    <Map
      mapId={MAP_ID}
      defaultCenter={MONTREAL_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      minZoom={10}
      restriction={RESTRICTION}
      colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      onIdle={onIdle}
      className="absolute inset-0"
    >
      <LandmarkMarkers landmarks={landmarks} selectedId={selectedId} onSelect={onSelect} />
      {selected && <GeofenceShape landmark={selected} />}
      {fix && <UserLocation fix={fix} />}
      <CameraMoves focus={focus} selected={selected} summary={summary} onFocused={onFocused} fix={fix} />
    </Map>
  )
}

/**
 * Moves the camera: to a selected landmark (a map tap pans; a deep link or list pick also zooms,
 * fitting the polygon when there is one) and to a fresh "locate me" fix. Offsets the target so
 * it isn't hidden under the sheet (phones) or the side panel (laptops).
 */
function CameraMoves({ focus, selected, summary, onFocused, fix }: Pick<GoogleMapProps, 'focus' | 'selected' | 'summary' | 'onFocused' | 'fix'>) {
  const map = useMap()

  useEffect(() => {
    if (!map || !focus) return
    const target = selected && matches(selected, focus.key) ? selected : summary && matches(summary, focus.key) ? summary : null
    // Zooming waits for the details (it needs the polygon); a plain pan can use the pin right away.
    if (!target || (focus.zoom && target !== selected)) return
    const wide = window.matchMedia('(min-width: 64rem)').matches
    const div = map.getDiv()
    const polygon = focus.zoom && selected?.polygon ? pathsBounds(polygonPaths(selected.polygon)) : null
    if (polygon) {
      map.fitBounds(polygon, wide ? { top: 80, bottom: 40, left: 380, right: 80 } : { top: 70, left: 40, right: 40, bottom: div.clientHeight * 0.65 })
    } else {
      if (focus.zoom) map.setZoom(Math.max(map.getZoom() ?? DEFAULT_ZOOM, 16))
      map.panTo({ lat: target.lat, lng: target.lng })
      if (wide) map.panBy(-180, 0)
      else map.panBy(0, Math.round(div.clientHeight * 0.28))
    }
    onFocused()
  }, [map, focus, selected, summary, onFocused])

  useEffect(() => {
    if (!map || !fix) return
    map.panTo({ lat: fix.lat, lng: fix.lng })
    map.setZoom(fix.accuracyM < 250 ? 16 : 14)
  }, [map, fix])

  return null
}

function ZoomButtons() {
  const map = useMap()
  const zoom = (by: number) => map && map.setZoom((map.getZoom() ?? DEFAULT_ZOOM) + by)
  const cls = 'grid size-11 place-items-center hover:bg-saffron-soft'
  return (
    <div className="sheet-grain hidden flex-col divide-y-2 divide-ink border-2 border-ink shadow-block-sm lg:flex">
      <button type="button" onClick={() => zoom(1)} aria-label="Zoom in" className={cls}>
        <Icon name="plus" accent="none" strokeWidth={2.2} className="size-5" />
      </button>
      <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out" className={cls}>
        <Icon name="minus" accent="none" strokeWidth={2.2} className="size-5" />
      </button>
    </div>
  )
}

// ---- Small pieces -------------------------------------------------------------------------

function ToolButton({ icon, label, pressed, badge = 0, onClick }: { icon: 'tag' | 'clipboard'; label: string; pressed: boolean; badge?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={badge ? `${label} (${badge} on)` : label}
      className={cn(
        'relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 border-2 border-ink px-2 text-xs font-bold tracking-[0.08em] uppercase shadow-block-sm sm:px-3',
        pressed ? 'bg-saffron' : 'sheet-grain hover:bg-saffron-soft',
      )}
    >
      <Icon name={icon} className="size-5" accent={pressed ? 'sheet' : 'saffron'} />
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 && <span className="absolute -top-2 -right-2 grid size-5 place-items-center border-2 border-ink bg-ink text-[0.65rem] text-sheet">{badge}</span>}
    </button>
  )
}

function Note({ tone = 'info', role, children }: { tone?: 'info' | 'warn'; role?: 'alert'; children: ReactNode }) {
  return (
    <p
      role={role ?? 'status'}
      className={cn(
        'border-2 px-3 py-2 text-xs leading-snug font-semibold shadow-block-sm',
        tone === 'warn' ? 'border-sienna-deep bg-sienna-soft' : 'sheet-grain border-ink',
      )}
    >
      {children}
    </p>
  )
}

function MapUnavailable({ reason }: { reason: 'missing-key' | 'load-failed' }) {
  return (
    <div className="sheet-grain pointer-events-auto flex items-start gap-3 border-2 border-ink p-3 shadow-block-sm">
      <Mascot pose="search" className="h-16 shrink-0" />
      <div className="min-w-0 text-sm leading-snug">
        <p className="eyebrow">Map unavailable</p>
        <p className="mt-1">
          {reason === 'missing-key'
            ? 'The Google Maps key (VITE_GOOGLE_MAPS_API_KEY) isn’t set, so the map can’t be drawn.'
            : 'Google Maps didn’t load (check the key and its allowed sites).'}{' '}
          The landmark list still works: pick one to see its details or open the camera.
        </p>
      </div>
    </div>
  )
}
