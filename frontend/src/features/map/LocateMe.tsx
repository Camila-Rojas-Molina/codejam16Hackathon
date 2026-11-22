// "Locate me": ONE reading, only when the button is pressed. No watchPosition, nothing kept or
// sent anywhere: the fix just puts a dot (and its accuracy circle) on the map. The first press
// explains that before the browser asks for permission.
import { useState } from 'react'
import Icon from '../../components/icons/Icon'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { ISLAND_BOUNDS, containsPoint } from './geo'
import type { UserFix } from './MapOverlays'

type Status = { kind: 'idle' } | { kind: 'explain' } | { kind: 'asking' } | { kind: 'error'; message: string } | { kind: 'note'; message: string }

function errorMessage(e: GeolocationPositionError): string {
  if (e.code === e.PERMISSION_DENIED) return 'Location is blocked for this site. Allow it in your browser settings to see where you are.'
  if (e.code === e.TIMEOUT) return 'Finding you took too long. Step outside or near a window and try again.'
  return 'Your position isn’t available right now. Check that location services are on and try again.'
}

type Props = {
  onFix: (fix: UserFix) => void
  className?: string
}

export default function LocateMe({ onFix, className }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [explained, setExplained] = useState(false)

  const locate = () => {
    setExplained(true)
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'error', message: 'This browser can’t share your location.' })
      return
    }
    setStatus({ kind: 'asking' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy }
        onFix(fix)
        setStatus(
          containsPoint(ISLAND_BOUNDS, fix)
            ? { kind: 'idle' }
            : { kind: 'note', message: 'You seem to be off Montréal Island. Landmarks can only be logged on the island.' },
        )
      },
      (e) => setStatus({ kind: 'error', message: errorMessage(e) }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }

  const asking = status.kind === 'asking'
  const message = status.kind === 'error' || status.kind === 'note' ? status.message : null

  return (
    <div className={cn('flex flex-col items-end gap-2', className)}>
      {status.kind === 'explain' && (
        <div role="dialog" aria-label="Show my location" className="sheet-grain w-64 max-w-[calc(100vw-6rem)] border-2 border-ink p-3 text-sm shadow-block-sm">
          <p className="leading-snug">Your browser will ask to share your location once. It only puts a dot on this map; nothing is tracked or saved.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={locate} autoFocus>
              Find me
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
              Not now
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex w-64 max-w-[calc(100vw-6rem)] items-start gap-2 border-2 p-2.5 text-xs leading-snug shadow-block-sm',
            status.kind === 'error' ? 'border-sienna-deep bg-sienna-soft' : 'sheet-grain border-ink',
          )}
        >
          <span className="flex-1">{message}</span>
          <button type="button" onClick={() => setStatus({ kind: 'idle' })} aria-label="Dismiss" className="-m-1.5 grid size-8 shrink-0 place-items-center">
            <Icon name="close" accent="none" className="size-4" />
          </button>
        </p>
      )}
      <button
        type="button"
        onClick={() => (explained ? locate() : setStatus({ kind: 'explain' }))}
        disabled={asking}
        aria-label={asking ? 'Finding your location…' : 'Show my location'}
        aria-busy={asking}
        className="sheet-grain grid size-12 place-items-center border-2 border-ink shadow-block-sm transition-colors hover:bg-saffron-soft active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-70"
      >
        <Icon name="compass" accent="teal" className={cn('size-6', asking && 'animate-spin')} />
      </button>
    </div>
  )
}
