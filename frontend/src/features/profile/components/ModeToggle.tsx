// Compact Tourist ⇄ Local toggle for the dashboard status bar. Same behaviour as ModeSwitch:
// switches instantly if the mode is set up, otherwise opens its short setup first.
//
// Both options look the same until you touch them: two equal, white (sheet) buttons. Hover tints
// Tourist saffron and Local teal; the current mode is filled, gets a thicker ink rule and a tick,
// and is announced as pressed. Nothing relies on hover, so it reads the same on phones.
import { Link, useLocation } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { CheckMark } from '../../../components/ui/Choices'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { MODE_OPTIONS } from '../../onboarding/options'
import { activeTrip, isModeReady } from '../model'
import { modeOptionClasses, useModeSwitcher } from '../useModeSwitcher'

/** The small ink tick that marks the chosen mode. */
export function ModeCheck({ small = false, inverted = false, className }: { small?: boolean; inverted?: boolean; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full', inverted ? 'bg-sheet text-ink' : 'bg-ink text-sheet', small ? 'size-4' : 'size-5', className)}
      aria-hidden
    >
      <CheckMark className={small ? 'size-3' : 'size-3.5'} strokeWidth={3.4} />
    </span>
  )
}

type ModeToggleProps = {
  /** Icons only (phones). Labels are still read by screen readers. */
  compact?: boolean
  /** One line under the toggle saying what the mode is pointed at. */
  showContext?: boolean
  className?: string
}

export default function ModeToggle({ compact = false, showContext = false, className }: ModeToggleProps) {
  const { profile } = useStore()
  const { pathname } = useLocation()
  const { choose, pending, message, activeMode } = useModeSwitcher()
  return (
    <div className={className}>
      <div role="group" aria-label="Exploring mode" className="grid grid-cols-2 gap-1.5">
        {MODE_OPTIONS.map((m) => {
          const active = activeMode === m.mode
          const ready = isModeReady(profile, m.mode)
          return (
            <button
              key={m.mode}
              type="button"
              aria-pressed={active}
              aria-busy={pending === m.mode || undefined}
              aria-label={compact ? `${m.title} mode${ready ? '' : ' (needs a quick setup)'}` : undefined}
              title={`${m.title} mode`}
              onClick={() => choose(m.mode, { returnTo: pathname })}
              className={cn(
                modeOptionClasses(m.mode, active),
                'flex min-h-11 items-center justify-center gap-1.5 text-xs font-bold tracking-[0.1em] uppercase',
                compact ? 'min-w-12 px-2' : 'px-3',
              )}
            >
              {active && !compact && <ModeCheck />}
              <Icon name={m.icon} accent={m.accent} className="size-5" />
              {!compact && <span>{m.title}</span>}
              {/* Phones: the tick sits in the corner so the icon stays centred. */}
              {active && compact && <ModeCheck small className="absolute top-0.5 left-0.5" />}
              {!ready && !compact && <span className="sr-only">(needs a quick setup)</span>}
              {/* Not set up yet: a small sienna corner flag. */}
              {!ready && <span className="absolute top-0 right-0 size-0 border-t-[10px] border-l-[10px] border-t-sienna border-l-transparent" aria-hidden />}
            </button>
          )
        })}
      </div>
      {showContext && <ModeContext className="mt-2 justify-center" />}
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  )
}

/** One line saying what the current mode is pointed at (trip or home city), with a shortcut. */
export function ModeContext({ className }: { className?: string }) {
  const { profile } = useStore()
  const activeMode = profile?.activeMode ?? null
  const trip = activeTrip(profile)
  return (
    <p className={cn('flex min-w-0 items-center gap-1.5 text-xs font-semibold', className)}>
      {activeMode === 'tourist' && trip && (
        <>
          <Icon name="plane" className="size-4" />
          <span className="truncate">
            Exploring <strong className="font-bold">{trip.destination}</strong>
          </span>
          <Link to="/trips" className="shrink-0 underline decoration-2 underline-offset-2">
            Trips
          </Link>
        </>
      )}
      {activeMode === 'local' && profile?.local && (
        <>
          <Icon name="house" accent="teal" className="size-4" />
          <span className="truncate">
            Hosting in <strong className="font-bold">{profile.local.homeCity}</strong>
          </span>
        </>
      )}
      {!activeMode && 'Pick a mode to start exploring'}
    </p>
  )
}
