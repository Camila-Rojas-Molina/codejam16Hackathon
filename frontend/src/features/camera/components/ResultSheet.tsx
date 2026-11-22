// The panel under a taken photo: what the server decided and what can be done next, one state of
// the capture machine at a time. The photo itself stays on screen above it the whole time.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { Mascot } from '../../../components/illustrations/Mascot'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { canSave, needsRetake, selectedCandidate, type CaptureState } from '../captureMachine'
import CandidatePicker from './CandidatePicker'

type ResultSheetProps = {
  state: CaptureState
  onSelect: (id: string) => void
  onSave: () => void
  onRelocate: () => void
  onRetake: () => void
  onCancel: () => void
  onDownload: () => void
}

export default function ResultSheet({ state: s, onSelect, onSave, onRelocate, onRetake, onCancel, onDownload }: ResultSheetProps) {
  const busy = s.phase === 'uploading'
  const chosen = selectedCandidate(s)
  const candidates = s.check?.candidates ?? []
  const limits = s.check?.limits

  const retake = (
    <Button variant="secondary" icon="camera" onClick={onRetake} disabled={busy} className="flex-1">
      Retake
    </Button>
  )
  const cancel = (
    <Button variant="ghost" onClick={onCancel} disabled={busy} className="flex-1">
      Cancel
    </Button>
  )
  const relocate = (primary = true) => (
    <Button variant={primary ? 'primary' : 'secondary'} icon="compass" onClick={onRelocate} className="flex-1">
      Retry location
    </Button>
  )
  const save = (label = 'Save photo') => (
    <Button icon="check" onClick={onSave} disabled={!canSave(s) || busy} aria-busy={busy || undefined} className="flex-1">
      {busy ? 'Saving…' : label}
    </Button>
  )

  switch (s.phase) {
    case 'capturing':
    case 'locating':
    case 'checking':
      return (
        <Sheet>
          <div className="flex items-center gap-3">
            <Mascot pose="search" className="h-16 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">
                {s.phase === 'capturing' ? 'Developing your photo…' : s.phase === 'locating' ? 'Finding your position…' : 'Looking for MIGO places nearby…'}
              </p>
              <p className="text-sm">One location reading, just for this photo.</p>
            </div>
          </div>
          <Actions>{cancel}</Actions>
        </Sheet>
      )

    case 'ready':
    case 'uploading': {
      const switchable = chosen ? candidates.length > 1 : candidates.length > 0
      return (
        <Sheet>
          {chosen ? (
            <Headline icon="pin" eyebrow="MIGO place found">
              This photo will be saved at <span className="text-sienna-deep">{chosen.name}</span>
            </Headline>
          ) : (
            <Headline icon="globe" eyebrow="Montréal memory">
              No MIGO place here — it’ll be saved as a Montréal memory
            </Headline>
          )}
          {switchable && (
            <details className="mt-3 border-2 border-dashed border-ink p-2" open={!chosen}>
              <summary className="min-h-10 cursor-pointer content-center font-bold">{chosen ? 'Not this one? Pick another place' : 'Pick a nearby place'}</summary>
              <div className="mt-2">
                <CandidatePicker legend="Places at this spot" candidates={candidates} selectedId={s.selectedId} onSelect={onSelect} disabled={busy} />
              </div>
            </details>
          )}
          <Actions>
            {save()}
            {retake}
          </Actions>
        </Sheet>
      )
    }

    case 'choose':
      return (
        <Sheet>
          <Headline icon="pin" eyebrow="Several places here">
            Which place is this photo of?
          </Headline>
          {s.message && <p className="mt-1 text-sm">{s.message}</p>}
          <div className="mt-3">
            <CandidatePicker legend="Pick one" candidates={candidates} selectedId={s.selectedId} onSelect={onSelect} />
          </div>
          <Actions>
            {save(s.selectedId ? 'Save photo' : 'Pick a place first')}
            {cancel}
          </Actions>
        </Sheet>
      )

    case 'retry_location': {
      if (needsRetake(s)) {
        return (
          <Sheet>
            <Headline icon="clock" eyebrow="Photo and location too far apart">
              Take the photo again
            </Headline>
            <p className="mt-1">{s.message}</p>
            <p className="mt-2 text-sm">
              The location has to be read within {limits ? `${limits.maxCaptureGapS} s` : 'moments'} of taking the photo. A new photo starts
              a fresh reading.
            </p>
            <Actions>
              <Button icon="camera" onClick={onRetake} className="flex-1">
                Retake
              </Button>
              {cancel}
            </Actions>
          </Sheet>
        )
      }
      return (
        <Sheet>
          <Headline icon="compass" eyebrow="Location can’t be trusted yet">
            Let’s try that location again
          </Headline>
          <p className="mt-1">{s.message}</p>
          {s.fix && s.check?.reason === 'poor_accuracy' && (
            <p className="mt-2 text-sm">
              Your reading: ±{Math.round(s.fix.accuracyM)} m{limits ? ` · needed: ±${limits.maxAccuracyM} m or better` : ''}.
            </p>
          )}
          {s.fix && s.check?.reason !== 'poor_accuracy' && <p className="mt-2 text-sm">Accuracy of the last reading: ±{Math.round(s.fix.accuracyM)} m.</p>}
          <p className="mt-1 text-sm">Your photo is kept.</p>
          <Actions>
            {relocate()}
            {retake}
            {cancel}
          </Actions>
        </Sheet>
      )
    }

    case 'outside_area':
      return (
        <Sheet>
          <Headline icon="map" eyebrow="Outside Montréal Island">
            MIGO only covers Montréal Island for now
          </Headline>
          <p className="mt-1">
            Photos can only be saved to your gallery when they’re taken on the island. Nothing was uploaded.
            {s.message ? ` ${s.message}` : ''}
          </p>
          <Actions>
            <Button variant="secondary" icon="arrow-down" onClick={onDownload} className="flex-1">
              Save to device
            </Button>
            <Button onClick={onCancel} icon="trash" className="flex-1">
              Discard
            </Button>
          </Actions>
        </Sheet>
      )

    case 'error': {
      const canRelocate = s.error === 'gps_denied' || s.error === 'rate_limited' || s.error === 'check_failed' || s.error === 'save_failed'
      const title =
        s.error === 'gps_denied'
          ? 'Location is turned off for MIGO'
          : s.error === 'gps_unsupported'
            ? 'No location on this browser'
            : s.error === 'rate_limited'
              ? 'Easy there, explorer'
              : s.error === 'image'
                ? 'This photo couldn’t be prepared'
                : s.error === 'check_failed'
                  ? 'Couldn’t check your location'
                  : 'Couldn’t save your photo'
      return (
        <Sheet>
          <Headline icon="alert" eyebrow={s.error === 'rate_limited' ? 'Too many photos at once' : 'Something got in the way'}>
            {title}
          </Headline>
          {s.message && <p className="mt-1">{s.message}</p>}
          {s.error === 'rate_limited' && <p className="mt-1 text-sm">Wait a moment, then try again. Your photo is kept.</p>}
          <Actions>
            {s.error === 'save_failed' && canSave(s) && save('Try saving again')}
            {canRelocate && s.error !== 'save_failed' && relocate()}
            {s.error === 'image' ? retake : null}
            {cancel}
          </Actions>
        </Sheet>
      )
    }

    case 'saved': {
      const r = s.result
      return (
        <Sheet>
          <div className="flex items-center gap-3">
            <Mascot pose={r?.newDiscovery ? 'leap' : 'cheer'} className="h-20 shrink-0" />
            <div className="min-w-0">
              {r?.newDiscovery && (
                <Badge tone="saffron" icon="sparkle" className="mb-1">
                  New discovery!
                </Badge>
              )}
              <p className="text-xl font-bold break-words">
                {r?.landmark ? `Saved at ${r.landmark.name}` : 'Saved as a Montréal memory'}
              </p>
              <p className="text-sm">{r?.landmark ? 'It’s on your map and in your gallery.' : 'It’s in your gallery.'}</p>
            </div>
          </div>
          <Actions>
            <Link to="/gallery" className={buttonClasses({ className: 'flex-1' })}>
              <Icon name="gallery" accent="sheet" className="size-5" />
              View in Gallery
            </Link>
            {r?.landmark && (
              <Link to={`/map?landmark=${encodeURIComponent(r.landmark.id)}`} className={buttonClasses({ variant: 'secondary', className: 'flex-1' })}>
                <Icon name="map" className="size-5" />
                See on map
              </Link>
            )}
            <Button variant="ghost" icon="camera" onClick={onRetake} className="flex-1">
              Take another
            </Button>
          </Actions>
        </Sheet>
      )
    }

    default:
      return null
  }
}

function Sheet({ children }: { children: ReactNode }) {
  return <div className="sheet-grain border-t-2 border-ink pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-ink">{children}</div>
}

function Headline({ icon, eyebrow, children }: { icon: 'pin' | 'globe' | 'compass' | 'map' | 'alert' | 'clock'; eyebrow: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} accent={icon === 'alert' ? 'sienna' : 'saffron'} className="mt-1 size-7" />
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-xl break-words sm:text-2xl">{children}</h2>
      </div>
    </div>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2 [&>*]:min-w-[8.5rem]">{children}</div>
}
