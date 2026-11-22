// The selected landmark: a bottom sheet on phones, a side panel on laptops (the parent places it).
// Name, category, state, description, address, how close a photo must be, the open-data source,
// and the way to the camera. Focus moves to the name when a new landmark opens; Escape closes.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import Icon from '../../components/icons/Icon'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import type { LandmarkDetail, LandmarkSummary } from '../explore/types'
import { categoryIcon, categoryLabel, formatVisited } from './landmarkMeta'
import type { DetailState } from './useLandmarkDetail'

type Props = {
  state: DetailState
  /** What the list or the pin already knows, shown while the details load. */
  summary?: LandmarkSummary
  onClose: () => void
  onRetry: () => void
  /** Shown as "Back to list" when the landmark was opened from the list. */
  onBack?: () => void
  className?: string
}

const geofenceText = (l: Pick<LandmarkSummary, 'hasPolygon' | 'geofenceRadiusM'>) =>
  l.hasPolygon ? 'Anywhere inside this area' : `Take a photo within about ${Math.round(l.geofenceRadiusM)} m`

function Details({ l }: { l: LandmarkDetail }) {
  const place = [l.address, l.neighbourhood].filter(Boolean).join(' · ')
  return (
    <>
      {l.description && <p className="font-serif leading-snug">{l.description}</p>}
      <dl className="grid gap-2 text-sm">
        {place && (
          <div className="flex gap-2">
            <dt className="shrink-0">
              <Icon name="pin" label="Address" className="size-5" />
            </dt>
            <dd className="min-w-0">{place}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="shrink-0">
            <Icon name="camera" label="To count a visit" accent="teal" className="size-5" />
          </dt>
          <dd className="min-w-0 font-semibold">{geofenceText(l)}</dd>
        </div>
      </dl>
      <p className="text-xs">
        Source:{' '}
        {l.source.url ? (
          <a href={l.source.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-2">
            {l.source.name}
          </a>
        ) : (
          <span className="font-semibold">{l.source.name}</span>
        )}{' '}
        · {l.source.license}
      </p>
    </>
  )
}

export default function LandmarkSheet({ state, summary, onClose, onRetry, onBack, className }: Props) {
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const l = state.detail ?? summary
  const focusKey = l?.id ?? state.status

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [focusKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <section aria-labelledby="landmark-sheet-title" className={cn('sheet-grain flex flex-col border-2 border-ink shadow-block', className)}>
      <div className="flex items-center gap-1 border-b-2 border-ink pl-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-xs font-bold tracking-[0.08em] uppercase">
            <Icon name="arrow-left" accent="none" className="size-4" />
            Back to list
          </button>
        ) : (
          <p className="eyebrow flex items-center gap-1.5">
            {l && <Icon name={categoryIcon(l.category)} className="size-4" />}
            {l ? categoryLabel(l.category) : 'Landmark'}
          </p>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onClose} aria-label="Close details" className="grid size-11 place-items-center border-l-2 border-ink hover:bg-saffron-soft">
          <Icon name="close" accent="none" className="size-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <h2 id="landmark-sheet-title" ref={headingRef} tabIndex={-1} className="font-display text-2xl leading-tight break-words uppercase outline-none">
          {l ? l.name : state.status === 'missing' ? 'Landmark not found' : state.status === 'error' ? 'Couldn’t load this landmark' : 'Loading…'}
        </h2>

        {l && (
          <div className="flex flex-wrap gap-1.5">
            {onBack && <Badge tone="outline" icon={categoryIcon(l.category)}>{categoryLabel(l.category)}</Badge>}
            {l.visited ? (
              <Badge tone="teal" icon="check">
                {l.visitedAt ? `Visited ${formatVisited(l.visitedAt)}` : 'Visited'}
              </Badge>
            ) : (
              <Badge tone="outline">Not visited yet</Badge>
            )}
            {l.recommended && (
              <Badge tone="saffron" icon="star">
                Recommended for you
              </Badge>
            )}
          </div>
        )}

        {state.status === 'ready' && <Details l={state.detail} />}
        {state.status === 'loading' && <p className="text-sm" role="status">Loading details…</p>}
        {state.status === 'missing' && <p className="text-sm">This place isn’t in MIGO’s catalogue any more, or the link is wrong.</p>}
        {state.status === 'error' && (
          <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
            <span className="min-w-0 flex-1">{state.error}</span>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {l && state.status !== 'missing' && (
        <div className="border-t-2 border-ink p-3">
          <Button icon="camera" fullWidth onClick={() => navigate(`/camera?landmark=${encodeURIComponent(l.id)}`)}>
            Open camera
          </Button>
        </div>
      )}
    </section>
  )
}
