// No map (the 3D map can't start and there's no Google key, or the Maps script failed): say so plainly, and keep the catalogue
// usable as a list of every landmark on the island, with the same filters, details and camera link.
import { useEffect, useMemo, useState } from 'react'
import { Mascot } from '../../components/illustrations/Mascot'
import { cn } from '../../lib/cn'
import type { LandmarkCategory } from '../explore/types'
import { ISLAND_BOUNDS } from './geo'
import LandmarkList from './LandmarkList'
import LandmarkSheet from './LandmarkSheet'
import MapLegend from './MapLegend'
import MapNotice from './MapNotice'
import MapToolbar from './MapToolbar'
import { NO_FILTERS, byProminence, matchesFilters, type MapFilters } from './landmarkMeta'
import { SHEET_PANEL } from './layout'
import { useLandmarks } from './useLandmarks'
import { useRefreshOnReturn } from './useRefreshOnReturn'
import { useSelection } from './useSelection'

export default function CatalogueOnly({ reason, className }: { reason: 'missing-key' | 'load-failed' | 'no-map'; className?: string }) {
  const { landmarks, status, error, load, retry, refresh } = useLandmarks()
  const { selected, selectedId, detail, select, close } = useSelection()
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS)

  useEffect(() => {
    void load(ISLAND_BOUNDS)
  }, [load])
  useRefreshOnReturn(() => {
    refresh()
    detail.reload()
  })

  const shown = useMemo(() => landmarks.filter((l) => matchesFilters(l, filters)).sort(byProminence), [landmarks, filters])
  const categories = useMemo(() => [...new Set(landmarks.map((l) => l.category))].sort() as LandmarkCategory[], [landmarks])
  const summary =
    status === 'unconfigured' ? 'Catalogue offline' : status === 'loading' || status === 'idle' ? 'Loading landmarks…' : `${shown.length} of ${landmarks.length} places on the island`

  return (
    <section aria-label="Map" data-tour="map-view" className={cn('relative flex min-h-[22rem] flex-1 flex-col overflow-hidden border-2 border-ink bg-paper shadow-block', className)}>
      <MapToolbar summary={summary} busy={status === 'loading'} filters={filters} onFilters={setFilters} categories={categories} />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="hatch-soft flex items-center gap-3 border-b-2 border-ink p-3">
            <Mascot pose="search" className="h-20 shrink-0" />
            <div className="sheet-grain min-w-0 border-2 border-ink p-3 shadow-block-sm">
              <p className="eyebrow">{reason === 'missing-key' ? 'Map key missing' : reason === 'no-map' ? 'Map unavailable' : 'Map didn’t load'}</p>
              <p className="mt-1 text-sm leading-snug">
                {reason === 'missing-key' ? (
                  <>
                    The map needs a Google Maps key (<code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code>). Until it’s set, every landmark is listed
                    below.
                  </>
                ) : reason === 'no-map' ? (
                  'The map couldn’t start on this device (it needs WebGL and a connection to the map tiles). Every landmark is listed below meanwhile.'
                ) : (
                  'Google Maps refused to load here (check the key and its allowed websites). Every landmark is listed below meanwhile.'
                )}
              </p>
            </div>
          </div>

          {status === 'unconfigured' && (
            <MapNotice className="m-3" icon="globe">
              The landmark catalogue lives on MIGO’s online service, and this copy runs on this device only, so there’s nothing to list yet.
            </MapNotice>
          )}
          {status === 'error' && (
            <MapNotice className="m-3" tone="error" action={{ label: 'Retry', onClick: retry }}>
              Couldn’t load the landmarks. {error}
            </MapNotice>
          )}
          {status === 'ready' && (
            <LandmarkList
              items={shown}
              selectedId={selectedId}
              onSelect={(l) => select(l.id)}
              label="Landmarks on Montréal Island"
              empty={landmarks.length ? 'Nothing matches these filters.' : 'No landmarks in the catalogue yet.'}
              className={cn(selected && 'pb-[60vh] lg:pr-[23.5rem] lg:pb-0')}
            />
          )}
        </div>

        {selected && detail.state && (
          <LandmarkSheet state={detail.state} summary={landmarks.find((l) => l.id === selectedId)} onClose={close} onRetry={detail.retry} className={SHEET_PANEL} />
        )}
      </div>
      <MapLegend className="border-t-2 border-ink sheet-grain" />
    </section>
  )
}
