// The Tourist ⇄ Local switch shown on the main screens. Same account, same profile; just a different context.
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { MODE_OPTIONS } from '../../onboarding/options'
import { activeTrip, formatTripDates, isModeReady } from '../model'
import { modeOptionClasses, useModeSwitcher } from '../useModeSwitcher'
import { ModeCheck } from './ModeToggle'

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
      <div role="group" aria-label="Exploring mode" className="grid grid-cols-2 gap-2">
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
                modeOptionClasses(m.mode, active),
                'flex min-h-12 flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 py-2 text-sm font-bold tracking-[0.1em] uppercase',
              )}
            >
              {active && <ModeCheck />}
              <Icon name={m.icon} accent={m.accent} className="size-5" />
              <span>{m.title}</span>
              {!ready && <span className="border-2 border-ink bg-sheet px-1.5 text-[0.6rem]">Set up</span>}
            </button>
          )
        })}
      </div>

      {/* What the current mode is pointed at, with a shortcut to change it. */}
      <p className="mt-2 flex min-h-6 flex-wrap items-center justify-center gap-x-2 text-center text-sm font-semibold">
        {activeMode === 'tourist' && trip && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="plane" className="size-4" />
              Exploring <strong>{trip.destination}</strong>
              {formatTripDates(trip) && <> · {formatTripDates(trip)}</>}
            </span>
            <Link to="/trips" className="font-bold underline decoration-2 underline-offset-4">
              Change trip
            </Link>
          </>
        )}
        {activeMode === 'local' && local && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="house" accent="teal" className="size-4" />
              Hosting in <strong>{local.homeCity}</strong>
            </span>
            <Link to="/mode/local" state={{ activate: false, returnTo }} className="font-bold underline decoration-2 underline-offset-4">
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
