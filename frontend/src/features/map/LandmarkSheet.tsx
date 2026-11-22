// The selected landmark's details: a bottom sheet on phones and tablets, a panel over the map's
// left edge on laptops. Shows what it is, whether you've been, how close a photo has to be, the
// catalogue attribution, and the way into the camera.
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import Icon from '../../components/icons/Icon'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { cn } from '../../lib/cn'
import type { LandmarkSummary } from '../explore/types'
import { categoryOf, formatDate } from './geo'
import type { LandmarkDetailState } from './useLandmarkDetail'

type Props = LandmarkDetailState & {
  /** What the map already knows (name, flags) while the full details load. */
  summary: LandmarkSummary | null
  onClose: () => void
  className?: string
}

export default function LandmarkSheet({ detail, summary, loading, error, notFound, retry, onClose, className }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const base = detail ?? summary
  const id = base?.id ?? null

  // Move focus to the heading when a landmark opens, so screen readers land on it.
  useEffect(() => {
    if (id) headingRef.current?.focus({ preventScroll: true })
  }, [id])

  const cat = base ? categoryOf(base.category) : null
  const place = detail ? [detail.address, detail.neighbourhood].filter(Boolean).join(' · ') : ''

  return (
    <section
      aria-label="Landmark details"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className={cn(
        'sheet-grain absolute inset-x-0 bottom-0 z-30 flex max-h-[72%] flex-col border-t-2 border-ink shadow-[0_-3px_0_var(--shadow-ink)]',
        'lg:inset-x-auto lg:top-[4.25rem] lg:bottom-3 lg:left-3 lg:max-h-none lg:w-[22rem] lg:border-2 lg:shadow-block-sm',
        'animate-step-in',
        className,
      )}
    >
      {/* Header: the grab-bar look on phones, then category, name and close. */}
      <div className="flex items-start gap-2 border-b-2 border-ink px-4 pt-2 pb-3">
        <div className="min-w-0 flex-1">
          <span aria-hidden className="mx-auto mb-2 block h-1 w-10 bg-ink/40 lg:hidden" />
          {cat && (
            <p className="eyebrow flex items-center gap-1.5">
              <Icon name={cat.icon} className="size-4" />
              {cat.label}
            </p>
          )}
          <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl leading-tight break-words outline-none">
            {base?.name ?? (notFound ? 'Not found' : 'Loading…')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="-mr-2 grid size-11 shrink-0 place-items-center border-2 border-transparent hover:border-ink hover:bg-saffron-soft"
        >
          <Icon name="close" accent="none" strokeWidth={2.2} className="size-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
        {notFound && <p className="text-sm">This landmark isn’t in the catalogue any more. It may have been retired or renamed.</p>}

        {error && !detail && (
          <div role="alert" className="flex flex-col items-start gap-2 border-2 border-sienna-deep bg-sienna-soft p-3 text-sm">
            <p className="font-semibold">Couldn’t load the details.</p>
            <Button size="sm" variant="secondary" icon="undo" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {base && (
          <div className="flex flex-wrap gap-2">
            {base.visited ? (
              <Badge tone="teal" icon="check">
                {base.visitedAt ? `Visited ${formatDate(base.visitedAt)}` : 'Visited'}
              </Badge>
            ) : (
              <Badge tone="outline">Not visited yet</Badge>
            )}
            {base.recommended && (
              <Badge tone="saffron" icon="star">
                Recommended for you
              </Badge>
            )}
          </div>
        )}

        {loading && !detail && !error && <p className="text-sm italic" aria-live="polite">Loading details…</p>}

        {detail && (
          <>
            {detail.description && <p className="font-serif text-base leading-relaxed">{detail.description}</p>}
            {place && (
              <p className="flex items-start gap-2 text-sm font-semibold">
                <Icon name="pin" className="mt-0.5 size-5" />
                <span>{place}</span>
              </p>
            )}
            <p className="flex items-start gap-2 border-2 border-dashed border-ink bg-teal-soft p-3 text-sm leading-snug">
              <Icon name="camera" accent="teal" className="mt-0.5 size-5" />
              <span>
                {detail.hasPolygon
                  ? 'Take a photo anywhere inside this area (shaded on the map) to log your visit.'
                  : `Take a photo within ~${Math.round(detail.geofenceRadiusM)} m of it (the circle on the map) to log your visit.`}
              </span>
            </p>
          </>
        )}

        {id && (
          <Link to={`/camera?landmark=${encodeURIComponent(id)}`} className={buttonClasses({ variant: 'primary', fullWidth: true })}>
            <Icon name="camera" accent="sheet" className="size-5" />
            Open camera
          </Link>
        )}

        {detail && (
          <p className="border-t-2 border-ink pt-3 text-xs leading-snug">
            Source:{' '}
            {detail.source.url ? (
              <a href={detail.source.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-2">
                {detail.source.name}
              </a>
            ) : (
              <span className="font-semibold">{detail.source.name}</span>
            )}{' '}
            · {detail.source.license}
          </p>
        )}
      </div>
    </section>
  )
}
