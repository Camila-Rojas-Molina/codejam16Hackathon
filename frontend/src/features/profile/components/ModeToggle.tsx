// Compact Tourist ⇄ Local toggle for the dashboard status bar. Same behaviour as ModeSwitch:
// switches instantly if the mode is set up, otherwise opens its short setup first.
import { Link, useLocation } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { MODE_OPTIONS } from '../../onboarding/options'
import { activeTrip, isModeReady } from '../model'
import { useModeSwitcher } from '../useModeSwitcher'

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
      <div role="group" aria-label="Exploring mode" className="sheet-grain flex border-2 border-ink">
        {MODE_OPTIONS.map((m, i) => {
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
                'relative flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs font-bold tracking-[0.1em] uppercase transition-colors',
                i > 0 && 'border-l-2 border-ink',
                compact ? 'min-w-12 px-2' : 'px-3',
                active ? m.activeClass : 'text-ink hover:bg-saffron-soft',
              )}
            >
              <Icon name={m.icon} accent={m.accent} className="size-5" />
              {!compact && <span>{m.title}</span>}
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
