// The map screen around whichever engine draws the map: the toolbar, notes on top of the map, the
// list panel, the details sheet, the floating actions (Locate me, Camera, plus any engine controls
// such as the 2D/3D toggle) and the key underneath. The engine's map goes in `children`.
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Icon from '../../components/icons/Icon'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { cn } from '../../lib/cn'
import type { LandmarkSummary } from '../explore/types'
import LandmarkList from './LandmarkList'
import LandmarkSheet from './LandmarkSheet'
import MapLegend from './MapLegend'
import MapNotice from './MapNotice'
import MapToolbar from './MapToolbar'
import { LIST_PANEL, SHEET_PANEL } from './layout'
import type { MapExplorer } from './useMapExplorer'
import type { useLocateMe } from './useLocateMe'

type Props = {
  ex: MapExplorer
  locate: ReturnType<typeof useLocateMe>
  /** A row in the list was picked: the engine moves its camera there. */
  onOpenFromList: (l: LandmarkSummary) => void
  /** Extra floating controls above Locate me. */
  controls?: ReactNode
  className?: string
  children: ReactNode
}

export default function MapFrame({ ex, locate, onOpenFromList, controls, className, children }: Props) {
  const navigate = useNavigate()
  const { status, error, retry, listOpen, setListOpen, sheetOpen, selected, detail } = ex

  return (
    <section aria-label="Map" data-tour="map-view" className={cn('relative flex min-h-[22rem] flex-1 flex-col overflow-hidden border-2 border-ink bg-teal-soft shadow-block', className)}>
      <MapToolbar
        summary={ex.summary}
        busy={status === 'loading'}
        filters={ex.filters}
        onFilters={ex.setFilters}
        categories={ex.categories}
        listOpen={listOpen}
        onToggleList={() => setListOpen((o) => !o)}
      />

      <div className="relative min-h-0 flex-1">
        {children}

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
              items={ex.shownInView}
              selectedId={ex.selectedId}
              onSelect={(l) => {
                ex.openFromList(l)
                onOpenFromList(l)
              }}
              label="Landmarks in view"
              empty={
                status === 'unconfigured' ? 'The catalogue is offline.' : ex.inView.length ? 'Nothing here matches these filters.' : 'No landmarks in view. Zoom out or move the map.'
              }
            />
          </div>
        )}

        {selected && detail.state && (
          <LandmarkSheet
            state={detail.state}
            summary={ex.selectedSummary}
            onClose={ex.close}
            onRetry={detail.retry}
            onBack={ex.fromList && listOpen ? ex.close : undefined}
            className={SHEET_PANEL}
          />
        )}

        {/* Floating actions. Hidden on phones while the sheet or the list covers the map. */}
        <div className={cn('absolute right-3 bottom-8 z-10 flex flex-col items-end gap-2', (sheetOpen || listOpen) && 'max-lg:hidden', sheetOpen && 'lg:right-[24rem]')}>
          {controls}
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
          <button type="button" data-tour="camera" onClick={() => navigate('/camera')} className={buttonClasses({ className: 'min-h-14 shadow-block-sm' })}>
            <Icon name="camera" accent="sheet" className="size-6" />
            Camera
          </button>
        </div>
      </div>

      <MapLegend className="sheet-grain border-t-2 border-ink" />
    </section>
  )
}
