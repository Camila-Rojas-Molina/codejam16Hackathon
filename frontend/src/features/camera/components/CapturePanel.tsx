// The sheet under the viewfinder once a photo is taken: progress, the place it will be saved at
// (or a choice between nearby places), location problems, and the result. Layout only: every
// decision comes from the capture machine's state.
import { useId, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import type { CandidateLandmark } from '../../explore/types'
import type { CaptureState } from '../captureMachine'
import { retryText } from '../messages'

export type PanelActions = {
  onPick: (landmarkId: string) => void
  onSave: () => void
  onRetryLocation: () => void
  onRetry: () => void
  onRetake: () => void
  onCancel: () => void
}

type Props = PanelActions & {
  state: Exclude<CaptureState, { phase: 'idle' } | { phase: 'previewing' }>
  /** Display name for a landmark id from the check, or null. */
  nameFor: (id: string | null) => string | null
  headingRef: RefObject<HTMLHeadingElement | null>
}

const distance = (m: number) => (m < 1000 ? `${Math.max(1, Math.round(m))} m away` : `${(m / 1000).toFixed(1)} km away`)

const downloadName = (ms: number) => `migo-${new Date(ms).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`

export default function CapturePanel({ state: s, nameFor, headingRef, ...on }: Props) {
  switch (s.phase) {
    case 'capturing':
    case 'locating':
    case 'checking':
    case 'uploading':
      return (
        <Shell busy>
          <div className="flex items-center gap-3">
            <Icon name={s.phase === 'uploading' ? 'gallery' : 'compass'} accent="teal" className="size-8 animate-spin-slow" />
            <div className="min-w-0 flex-1">
              <Title headingRef={headingRef} quiet>
                {s.phase === 'uploading' ? 'Saving your photo…' : s.phase === 'checking' ? 'Checking where you are…' : 'Getting your location…'}
              </Title>
              <p className="text-sm">{s.phase === 'uploading' ? 'Almost there.' : 'Hold on a few seconds. Your photo is kept.'}</p>
            </div>
          </div>
          {s.phase !== 'uploading' && (
            <Actions>
              <Button variant="secondary" onClick={on.onCancel}>
                Cancel
              </Button>
            </Actions>
          )}
        </Shell>
      )

    case 'needs_choice':
      return <ChoosePlace candidates={s.check.candidates} selectedId={s.selectedId} headingRef={headingRef} {...on} />

    case 'ready_to_save': {
      const name = nameFor(s.landmarkId)
      const visited = s.check.candidates.find((c) => c.id === s.landmarkId)?.visited
      return (
        <Shell>
          <p className="eyebrow">{name ? 'MIGO place' : 'Montréal'}</p>
          {name ? (
            <>
              <Title headingRef={headingRef}>
                This photo will be saved at <span className="text-teal-deep">{name}</span>
              </Title>
              {visited && <p className="mt-1 text-sm">You’ve been here before: it joins your other photos of this place.</p>}
            </>
          ) : (
            <>
              <Title headingRef={headingRef}>No MIGO place here</Title>
              <p className="mt-1 text-sm">It will be saved as a Montréal memory in your gallery.</p>
            </>
          )}
          <Actions>
            <Button icon="check" onClick={on.onSave}>
              Save photo
            </Button>
            <Button variant="secondary" icon="camera" onClick={on.onRetake}>
              Retake
            </Button>
          </Actions>
        </Shell>
      )
    }

    case 'retry_location': {
      const t = retryText(s.retry)
      return (
        <Shell>
          <p className="eyebrow">Location</p>
          <Title headingRef={headingRef}>{t.title}</Title>
          <p className="mt-1 text-sm">{t.body}</p>
          {t.accuracy && <p className="mt-1 text-sm font-semibold">{t.accuracy}</p>}
          <p className="mt-1 text-xs">Your photo is kept until you save or discard it.</p>
          <Actions>
            {t.canRetry && (
              <Button icon="compass" onClick={on.onRetryLocation}>
                {s.retry.cause === 'denied' ? 'Try again' : 'Retry location'}
              </Button>
            )}
            <Button variant={t.canRetry ? 'secondary' : 'primary'} icon="camera" onClick={on.onRetake}>
              Retake
            </Button>
            <Button variant="ghost" onClick={on.onCancel}>
              Cancel
            </Button>
          </Actions>
        </Shell>
      )
    }

    case 'outside_area':
      return (
        <Shell>
          <p className="eyebrow">Montréal only, for now</p>
          <Title headingRef={headingRef}>Outside Montréal Island</Title>
          <p className="mt-1 text-sm">MIGO links photos to places on Montréal Island only, so this one wasn’t uploaded.</p>
          {s.message && <p className="mt-1 text-xs">{s.message}</p>}
          <Actions>
            <a href={s.photo.previewUrl} download={downloadName(s.capturedAt)} className={buttonClasses({ variant: 'secondary' })}>
              <Icon name="arrow-down" className="size-5" />
              Keep on this device
            </a>
            <Button variant="danger" icon="trash" onClick={on.onCancel}>
              Discard
            </Button>
          </Actions>
        </Shell>
      )

    case 'error':
      return (
        <Shell>
          <p className="eyebrow">Not saved</p>
          <Title headingRef={headingRef}>Something went wrong</Title>
          <p className="mt-1 text-sm">{s.message}</p>
          <Actions>
            {s.resume ? (
              <Button icon="undo" onClick={on.onRetry}>
                Try again
              </Button>
            ) : (
              s.photo && (
                <Button icon="compass" onClick={on.onRetryLocation}>
                  Retry location
                </Button>
              )
            )}
            <Button variant={s.resume || s.photo ? 'secondary' : 'primary'} icon="camera" onClick={on.onRetake}>
              Retake
            </Button>
            <Button variant="ghost" onClick={on.onCancel}>
              Cancel
            </Button>
          </Actions>
        </Shell>
      )

    case 'saved': {
      const l = s.result.landmark
      return (
        <Shell>
          {s.result.newDiscovery && (
            <Badge stamp className="mb-2">
              New discovery!
            </Badge>
          )}
          <p className="eyebrow">{l ? 'Saved' : 'Montréal memory'}</p>
          <Title headingRef={headingRef}>{l ? `Saved at ${l.name}` : 'Saved as a Montréal memory'}</Title>
          {l && !s.result.newDiscovery && <p className="mt-1 text-sm">Added to your photos of this place.</p>}
          <Actions>
            <Link to="/gallery" className={buttonClasses()}>
              <Icon name="gallery" accent="sheet" className="size-5" />
              View in Gallery
            </Link>
            {l && (
              <Link to={`/map?landmark=${encodeURIComponent(l.id)}`} className={buttonClasses({ variant: 'secondary' })}>
                <Icon name="map" className="size-5" />
                See on map
              </Link>
            )}
            <Button variant="ghost" icon="camera" onClick={on.onRetake}>
              Take another
            </Button>
          </Actions>
        </Shell>
      )
    }
  }
}

function ChoosePlace({
  candidates,
  selectedId,
  headingRef,
  onPick,
  onSave,
  onRetake,
  onCancel,
}: PanelActions & { candidates: CandidateLandmark[]; selectedId: string | null; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const name = useId()
  const hintId = useId()
  return (
    <Shell>
      <p className="eyebrow">Several MIGO places nearby</p>
      <Title headingRef={headingRef}>Which one is in your photo?</Title>
      <p id={hintId} className="mt-1 text-sm">
        Pick the place you photographed. It must be one of these.
      </p>
      <fieldset className="mt-3" aria-describedby={hintId}>
        <legend className="sr-only">Place in your photo</legend>
        <ul className="grid gap-2">
          {candidates.map((c) => {
            const checked = selectedId === c.id
            return (
              <li key={c.id}>
                <label
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 border-2 border-ink px-3 py-2 transition-colors',
                    checked ? 'bg-saffron-soft' : 'hover:bg-saffron-soft/60',
                  )}
                >
                  <input type="radio" name={name} value={c.id} checked={checked} onChange={() => onPick(c.id)} className="size-5 shrink-0 accent-teal" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold break-words">{c.name}</span>
                    <span className="block text-xs">{distance(c.distanceM)}</span>
                  </span>
                  {c.visited && (
                    <Badge tone="teal" icon="flag">
                      Visited
                    </Badge>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <Actions>
        <Button icon="check" onClick={onSave} disabled={!selectedId}>
          Save photo
        </Button>
        <Button variant="secondary" icon="camera" onClick={onRetake}>
          Retake
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Actions>
    </Shell>
  )
}

function Shell({ busy, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section aria-busy={busy || undefined} className="sheet-grain max-h-[62dvh] shrink-0 overflow-y-auto border-t-2 border-ink pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-ink">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </section>
  )
}

function Title({ headingRef, quiet, children }: { headingRef: RefObject<HTMLHeadingElement | null>; quiet?: boolean; children: ReactNode }) {
  return (
    <h2 ref={headingRef} tabIndex={-1} className={cn('break-words focus:outline-none', quiet ? 'text-lg' : 'mt-1 text-2xl')}>
      {children}
    </h2>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:whitespace-nowrap sm:[&>*]:flex-none">{children}</div>
}
