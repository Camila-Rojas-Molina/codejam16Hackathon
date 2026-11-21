// Compact Tourist ⇄ Local toggle for the dashboard status bar. Same behaviour as ModeSwitch:
// switches instantly if the mode is set up, otherwise opens its short setup first.
import { Link, useLocation } from 'react-router'
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
  const trip = activeTrip(profile)

  return (
    <div className={className}>
      <div role="group" aria-label="Exploring mode" className="flex gap-1 rounded-full border-[3px] border-navy bg-paper p-1">
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
                'relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border-2 font-type text-xs tracking-wider uppercase transition-[transform,background-color] duration-150 active:scale-95',
                compact ? 'min-w-11 px-2' : 'px-3',
                active ? cn('border-navy', m.activeClass) : 'border-transparent text-navy hover:bg-bubble-light',
              )}
            >
              <span aria-hidden className="text-base leading-none">
                {m.emoji}
              </span>
              {!compact && <span>{m.title}</span>}
              {!ready && !compact && <span className="sr-only">(needs a quick setup)</span>}
              {!ready && <span className="absolute -top-1 -right-0.5 size-2.5 rounded-full border-2 border-navy bg-bubble-light" aria-hidden />}
            </button>
          )
        })}
      </div>
      {showContext && (
        <p className="mt-1.5 truncate text-center text-xs">
          {activeMode === 'tourist' && trip && (
            <>
              ✈️ Exploring <strong>{trip.destination}</strong> ·{' '}
              <Link to="/trips" className="font-semibold underline underline-offset-2">
                trips
              </Link>
            </>
          )}
          {activeMode === 'local' && profile?.local && (
            <>
              🏠 Hosting in <strong>{profile.local.homeCity}</strong>
            </>
          )}
          {!activeMode && 'Pick a mode to start exploring'}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
