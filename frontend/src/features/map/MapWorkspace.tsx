// The MAP tab's workspace: a Google map of Montréal Island with every active landmark.
//   * Pins load per viewport on 'idle' (debounced), cached by area; clusters at low zoom.
//   * Four pin states (see Pins.tsx), a key under the map, optional view filters, and a List
//     toggle that shows the same places as an accessible list.
//   * A pin opens its details (bottom sheet on phones, right panel on laptops) and draws its
//     geofence; /map?landmark=<id|slug> opens and centres one (used by the Gallery).
//   * "Locate me" takes ONE reading on tap. Visited flags refresh when the page regains focus.
//   * No Maps key, or the Maps script fails: CatalogueOnly lists everything instead.
/// <reference types="google.maps" />
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Circle,
  ColorScheme,
  ControlPosition,
  Map as GoogleMap,
  Polygon,
  useApiLoadingStatus,
  useMap,
  type MapEvent,
} from '@vis.gl/react-google-maps'
import Icon from '../../components/icons/Icon'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { config } from '../../lib/config'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/theme'
import type { Bounds, LandmarkCategory, LandmarkSummary } from '../explore/types'
import CatalogueOnly from './CatalogueOnly'
import { clusterLandmarks, type MapItem } from './cluster'
import { DEFAULT_ZOOM, FOCUS_ZOOM, ISLAND_BOUNDS, MONTREAL_CENTER, boundsOf, inBounds, padBounds, polygonPaths } from './geo'
import LandmarkList from './LandmarkList'
import LandmarkSheet from './LandmarkSheet'
import MapLegend from './MapLegend'
import MapNotice from './MapNotice'
import MapToolbar from './MapToolbar'
import { NO_FILTERS, byProminence, matchesFilters, pinDescription, pinState, type MapFilters } from './landmarkMeta'
import { LIST_PANEL, SHEET_PANEL, isCoarsePointer } from './layout'
import { ClusterBubble, LandmarkMarker, UserDot } from './Pins'
import type { LatLng } from './types'
import { useLandmarks } from './useLandmarks'
import { useLocateMe } from './useLocateMe'
import { useRefreshOnReturn } from './useRefreshOnReturn'
import { useSelection } from './useSelection'

const IDLE_DEBOUNCE_MS = 300

/** Where the camera was, so coming back to the tab (or switching Day/Night) keeps the view. */
const lastCamera: { center: LatLng; zoom: number } = { center: MONTREAL_CENTER, zoom: DEFAULT_ZOOM }

const isPhoneLayout = () => typeof window !== 'undefined' && !window.matchMedia?.('(min-width: 64rem)').matches

/** Room the sheet/panel takes, so a focused landmark isn't hidden under it. */
function focusPadding(map: google.maps.Map): google.maps.Padding {
  const h = map.getDiv().clientHeight
  return isPhoneLayout() ? { top: 48, left: 24, right: 24, bottom: Math.round(h * 0.5) } : { top: 48, left: 48, right: 400, bottom: 48 }
}

/** Moves a point into the part of the map the sheet doesn't cover. */
function revealPoint(map: google.maps.Map, p: LatLng, minZoom: number) {
  map.panTo(p)
  if ((map.getZoom() ?? 0) < minZoom) map.setZoom(minZoom)
  if (isPhoneLayout()) map.panBy(0, Math.round(map.getDiv().clientHeight * 0.22))
  else map.panBy(190, 0)
}

/** Theme colours for the geofence overlays (Google needs real colour values, not CSS variables). */
function useOverlayColours() {
  const { theme } = useTheme()
  return useMemo(() => {
    void theme
    const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
    const read = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback
    return { geofence: read('--color-teal-deep', '#1f5c5c'), accuracy: read('--color-teal', '#3a8f8a') }
  }, [theme])
}

export default function MapWorkspace({ className }: { className?: string }) {
  if (!config.googleMapsApiKey) return <CatalogueOnly reason="missing-key" className={className} />
  return (
    <APIProvider apiKey={config.googleMapsApiKey} region="CA">
      <LiveMap className={className} />
    </APIProvider>
  )
}

function LiveMap({ className }: { className?: string }) {
  const status = useApiLoadingStatus()
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) return <CatalogueOnly reason="load-failed" className={className} />
  return <MapExplorer className={className} />
}

function MapExplorer({ className }: { className?: string }) {
  const map = useMap()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const colours = useOverlayColours()
  const [coarse] = useState(isCoarsePointer)
  const { landmarks, status, error, load, retry, refresh } = useLandmarks()
  const { selected, selectedId, detail, select, close, focused } = useSelection()
  const [view, setView] = useState<{ bounds: Bounds; zoom: number } | null>(null)
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS)
  const [listOpen, setListOpen] = useState(false)
  const [fromList, setFromList] = useState(false)
  const idleTimer = useRef<number | undefined>(undefined)

  // ---- Viewport → landmarks -------------------------------------------------------------
  const onIdle = useCallback(
    (e: MapEvent) => {
      const m = e.map
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        const b = m.getBounds()?.toJSON()
        const center = m.getCenter()?.toJSON()
        const zoom = m.getZoom() ?? DEFAULT_ZOOM
        if (!b) return
        if (center) Object.assign(lastCamera, { center, zoom })
        const bounds: Bounds = { west: b.west, south: b.south, east: b.east, north: b.north }
        setView({ bounds, zoom })
        void load(bounds)
      }, IDLE_DEBOUNCE_MS)
    },
    [load],
  )
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  useRefreshOnReturn(() => {
    refresh()
    detail.reload()
  })

  const inView = useMemo(() => (view ? landmarks.filter((l) => inBounds(l, view.bounds)) : []), [landmarks, view])
  const shownInView = useMemo(() => inView.filter((l) => matchesFilters(l, filters)).sort(byProminence), [inView, filters])
  const categories = useMemo(() => [...new Set(landmarks.map((l) => l.category))].sort() as LandmarkCategory[], [landmarks])

  // Pins just past the edges too, so a small pan doesn't show empty space before 'idle'.
  const items: MapItem[] = useMemo(() => {
    if (!view) return []
    const area = padBounds(view.bounds, 0.15)
    const points = landmarks.filter((l) => l.id !== selectedId && inBounds(l, area) && matchesFilters(l, filters))
    return clusterLandmarks(points, view.zoom)
  }, [landmarks, view, filters, selectedId])

  // ---- Selection ------------------------------------------------------------------------
  const ready = detail.state?.status === 'ready' ? detail.state.detail : null
  const selectedSummary: LandmarkSummary | undefined = landmarks.find((l) => l.id === selectedId) ?? ready ?? undefined

  // Deep link: centre on the landmark once its details (and coordinates) arrive.
  useEffect(() => {
    if (!map || !selected?.focus || !ready) return
    const outline = ready.polygon ? boundsOf(polygonPaths(ready.polygon).flat()) : null
    if (outline) map.fitBounds(outline, focusPadding(map))
    else revealPoint(map, ready, FOCUS_ZOOM)
    focused()
  }, [map, selected?.focus, ready, focused])

  const openFromMap = (l: LandmarkSummary) => {
    setFromList(false)
    select(l.id)
  }
  const openFromList = (l: LandmarkSummary) => {
    setFromList(true)
    select(l.id)
    if (map) revealPoint(map, l, Math.max(map.getZoom() ?? 0, 15))
  }

  const zoomInto = (members: LandmarkSummary[], at: LatLng) => {
    if (!map) return
    const b = boundsOf(members)
    const zoom = map.getZoom() ?? DEFAULT_ZOOM
    if (!b || (b.east - b.west < 1e-5 && b.north - b.south < 1e-5)) {
      map.panTo(at)
      map.setZoom(Math.min(zoom + 3, 20))
    } else map.fitBounds(b, 64)
  }

  // ---- Locate me (one reading per tap) --------------------------------------------------
  const onFound = useCallback(
    (fix: LatLng) => {
      if (!map) return
      map.panTo(fix)
      if ((map.getZoom() ?? 0) < 15) map.setZoom(15)
    },
    [map],
  )
  const locate = useLocateMe(onFound)
  const fix = locate.state.status === 'found' ? locate.state.fix : null

  // ---- Copy -----------------------------------------------------------------------------
  const summary =
    status === 'unconfigured'
      ? 'Catalogue offline'
      : status === 'idle' || (status === 'loading' && landmarks.length === 0)
        ? 'Loading landmarks…'
        : shownInView.length === inView.length
          ? `${inView.length} ${inView.length === 1 ? 'place' : 'places'} in view`
          : `${shownInView.length} of ${inView.length} places in view`

  const sheetOpen = Boolean(selected && detail.state)
  const camera = { center: lastCamera.center, zoom: lastCamera.zoom }

  return (
    <section aria-label="Map" className={cn('relative flex min-h-[22rem] flex-1 flex-col overflow-hidden border-2 border-ink bg-teal-soft', className)}>
      <MapToolbar
        summary={summary}
        busy={status === 'loading'}
        filters={filters}
        onFilters={setFilters}
        categories={categories}
        listOpen={listOpen}
        onToggleList={() => setListOpen((o) => !o)}
      />

      <div className="relative min-h-0 flex-1">
        <GoogleMap
          key={theme}
          className="absolute inset-0"
          defaultCenter={camera.center}
          defaultZoom={camera.zoom}
          minZoom={10}
          mapId={config.googleMapsMapId || 'DEMO_MAP_ID'}
          colorScheme={theme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
          restriction={{ latLngBounds: ISLAND_BOUNDS, strictBounds: false }}
          gestureHandling={coarse ? 'greedy' : 'auto'}
          disableDefaultUI
          zoomControl={!coarse}
          zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
          clickableIcons={false}
          onIdle={onIdle}
        >
          {items.map((item) =>
            item.kind === 'landmark' ? (
              <AdvancedMarker
                key={item.key}
                position={item.landmark}
                title={pinDescription(item.landmark)}
                zIndex={item.landmark.recommended ? 2 : 1}
                onClick={() => openFromMap(item.landmark)}
              >
                <LandmarkMarker state={pinState(item.landmark)} category={item.landmark.category} />
              </AdvancedMarker>
            ) : (
              <AdvancedMarker
                key={item.key}
                position={item.position}
                title={`${item.members.length} landmarks here, ${item.visited} visited. Zoom in.`}
                zIndex={3}
                anchorLeft="-50%"
                anchorTop="-50%"
                onClick={() => zoomInto(item.members, item.position)}
              >
                <ClusterBubble count={item.members.length} visited={item.visited} recommended={item.recommended > 0} />
              </AdvancedMarker>
            ),
          )}

          {selectedSummary && (
            <AdvancedMarker position={selectedSummary} title={pinDescription(selectedSummary)} zIndex={10} onClick={() => openFromMap(selectedSummary)}>
              <LandmarkMarker state={pinState(selectedSummary)} category={selectedSummary.category} selected />
            </AdvancedMarker>
          )}

          {/* The selected landmark's geofence: its area, or the circle around it. */}
          {ready?.polygon ? (
            <Polygon
              paths={polygonPaths(ready.polygon)}
              strokeColor={colours.geofence}
              strokeWeight={2}
              fillColor={colours.geofence}
              fillOpacity={0.16}
              clickable={false}
            />
          ) : (
            selectedSummary &&
            !selectedSummary.hasPolygon && (
              <Circle
                center={selectedSummary}
                radius={selectedSummary.geofenceRadiusM}
                strokeColor={colours.geofence}
                strokeWeight={2}
                fillColor={colours.geofence}
                fillOpacity={0.16}
                clickable={false}
              />
            )
          )}

          {fix && (
            <>
              <Circle center={fix} radius={fix.accuracyM} strokeColor={colours.accuracy} strokeWeight={1} fillColor={colours.accuracy} fillOpacity={0.15} clickable={false} />
              <AdvancedMarker position={fix} title={`You are here (within about ${fix.accuracyM} m)`} zIndex={20} anchorLeft="-50%" anchorTop="-50%">
                <UserDot />
              </AdvancedMarker>
            </>
          )}
        </GoogleMap>

        {/* Notes over the top of the map. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-2 lg:right-auto lg:left-1/2 lg:w-[26rem] lg:-translate-x-1/2">
          {status === 'unconfigured' && (
            <MapNotice className="pointer-events-auto" icon="globe">
              The landmark catalogue lives on MIGO’s online service, and this copy runs on this device only, so there are no pins yet.
            </MapNotice>
          )}
          {status === 'error' && (
            <MapNotice className="pointer-events-auto" tone="error" action={{ label: 'Retry', onClick: retry }}>
              Couldn’t load landmarks for this area. {error}
            </MapNotice>
          )}
          {locate.state.status === 'error' && (
            <MapNotice className="pointer-events-auto" tone="error" onDismiss={locate.dismiss}>
              {locate.state.message}
            </MapNotice>
          )}
          {locate.state.status === 'found' && locate.state.note && (
            <MapNotice className="pointer-events-auto" icon="compass" onDismiss={locate.dismiss}>
              {locate.state.note}
            </MapNotice>
          )}
        </div>

        {listOpen && (
          <div className={cn(LIST_PANEL, sheetOpen && 'max-lg:hidden')}>
            <p className="eyebrow sticky top-0 z-10 border-b-2 border-ink bg-sheet px-3 py-2">In view now</p>
            <LandmarkList
              items={shownInView}
              selectedId={selectedId}
              onSelect={openFromList}
              label="Landmarks in view"
              empty={status === 'unconfigured' ? 'The catalogue is offline.' : inView.length ? 'Nothing here matches these filters.' : 'No landmarks in view. Zoom out or move the map.'}
            />
          </div>
        )}

        {selected && detail.state && (
          <LandmarkSheet
            state={detail.state}
            summary={selectedSummary}
            onClose={close}
            onRetry={detail.retry}
            onBack={fromList && listOpen ? close : undefined}
            className={SHEET_PANEL}
          />
        )}

        {/* Floating actions. Hidden on phones while the sheet or the list covers the map. */}
        <div className={cn('absolute right-3 bottom-8 z-10 flex flex-col items-end gap-2', (sheetOpen || listOpen) && 'max-lg:hidden', sheetOpen && 'lg:right-[24rem]')}>
          <button
            type="button"
            onClick={locate.locate}
            disabled={locate.state.status === 'locating'}
            aria-label={locate.state.status === 'locating' ? 'Finding your location' : 'Show my location'}
            aria-busy={locate.state.status === 'locating'}
            className="sheet-grain grid size-12 place-items-center border-2 border-ink shadow-block-sm transition-colors hover:bg-saffron-soft disabled:opacity-70"
          >
            <Icon name="compass" accent="teal" className={cn('size-6', locate.state.status === 'locating' && 'animate-spin')} />
          </button>
          <button type="button" onClick={() => navigate('/camera')} className={buttonClasses({ className: 'min-h-14 shadow-block-sm' })}>
            <Icon name="camera" accent="sheet" className="size-6" />
            Camera
          </button>
        </div>
      </div>

      <MapLegend className="sheet-grain border-t-2 border-ink" />
    </section>
  )
}
