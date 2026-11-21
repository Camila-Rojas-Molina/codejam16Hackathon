// The Tourist ⇄ Local switch shown on the main screens. Same account, same profile; just a different context.
import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { MODE_OPTIONS } from '../../onboarding/options'
import { activeTrip, formatTripDates, isModeReady } from '../model'
import { useModeSwitcher } from '../useModeSwitcher'

type ModeSwitchProps = {
  /** Where a first-time setup should return to after saving. */
  returnTo: string
  className?: string
}

export default function ModeSwitch({ returnTo, className }: ModeSwitchProps) {
  const { profile } = useStore()
  const { choose, pending, message, activeMode } = useModeSwitcher()
  const trip = activeTrip(profile)
  const local = profile?.local

  return (
    <div className={className}>
      <div role="group" aria-label="Exploring mode" className="flex gap-1.5 rounded-full border-[3px] border-navy bg-paper p-1.5">
        {MODE_OPTIONS.map((m) => {
          const active = activeMode === m.mode
          const ready = isModeReady(profile, m.mode)
          return (
            <button
              key={m.mode}
              type="button"
              aria-pressed={active}
              aria-busy={pending === m.mode || undefined}
              onClick={() => choose(m.mode, { returnTo })}
              className={cn(
                'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-[3px] px-3 font-type text-sm tracking-wider uppercase transition-[transform,background-color] duration-150 active:scale-95',
                active ? cn('border-navy', m.activeClass, 'motion-safe:animate-pop') : 'border-transparent text-navy hover:bg-bubble-light',
              )}
            >
              <span aria-hidden className="text-lg">
                {m.emoji}
              </span>
              <span>{m.title}</span>
              {!ready && (
                <span className="rounded-full border-2 border-navy bg-bubble-light px-1.5 text-[0.6rem] text-navy">
                  Set up
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* What the current mode is pointed at, with a shortcut to change it. */}
      <p className="mt-2 flex min-h-6 flex-wrap items-center justify-center gap-x-2 text-center text-sm">
        {activeMode === 'tourist' && trip && (
          <>
            <span>
              <span aria-hidden>✈️ </span>
              Exploring <strong>{trip.destination}</strong>
              {formatTripDates(trip) && <> · {formatTripDates(trip)}</>}
            </span>
            <Link to="/trips" className="font-semibold underline underline-offset-4">
              Change trip
            </Link>
          </>
        )}
        {activeMode === 'local' && local && (
          <>
            <span>
              <span aria-hidden>🏠 </span>
              Hosting in <strong>{local.homeCity}</strong>
            </span>
            <Link to="/mode/local" state={{ activate: false, returnTo }} className="font-semibold underline underline-offset-4">
              Edit
            </Link>
          </>
        )}
        {!activeMode && <span>Pick a mode to start exploring.</span>}
      </p>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
