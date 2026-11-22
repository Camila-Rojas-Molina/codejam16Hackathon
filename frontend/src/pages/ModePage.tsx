// /mode: "How are you exploring today?" Pick Tourist or Local. Shown right after onboarding, and any
// time someone wants to choose. Choosing a mode for the first time runs its short setup.
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Icon from '../components/icons/Icon'
import { MascotSays } from '../components/illustrations/Mascot'
import Screen from '../components/layout/Screen'
import Badge from '../components/ui/Badge'
import { buttonClasses } from '../components/ui/buttonStyles'
import { MODE_OPTIONS } from '../features/onboarding/options'
import { hasUniversalProfile } from '../features/profile/flow'
import { activeTrip, formatTripDates, isModeReady } from '../features/profile/model'
import { useModeSwitcher } from '../features/profile/useModeSwitcher'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

export default function ModePage() {
  const { account, profile } = useStore()
  const navigate = useNavigate()
  const welcome = (useLocation().state as { welcome?: boolean } | null)?.welcome === true
  const { choose, pending, message, activeMode } = useModeSwitcher()

  if (!account) return <Navigate to="/onboarding" replace />
  if (!hasUniversalProfile(profile)) return <Navigate to="/onboarding/questions" replace />

  const trip = activeTrip(profile)
  const tripCount = profile?.tourist.trips.length ?? 0

  function status(mode: 'tourist' | 'local') {
    if (!isModeReady(profile, mode)) return 'Quick one-minute setup'
    if (mode === 'tourist' && trip) return `Trip: ${trip.destination}${formatTripDates(trip) ? ` · ${formatTripDates(trip)}` : ''}`
    return `Home: ${profile?.local?.homeCity}`
  }

  return (
    <Screen className="gap-6 md:max-w-3xl">
      <MascotSays pose={welcome ? 'leap' : 'curious'} className="pt-2">
        {welcome ? (
          <p>
            You’re all set, <strong>{account.name}</strong>! Your profile’s saved. So, how are you exploring today?
          </p>
        ) : (
          <p>How are you exploring today, {account.name}?</p>
        )}
      </MascotSays>

      <header>
        <p className="eyebrow mb-2">Choose your mode</p>
        <h1 className="text-4xl sm:text-5xl">Tourist or local?</h1>
        <p className="mt-2">Same you, two ways to explore. Switch any time from the top of the app.</p>
      </header>

      <div className="grid border-2 border-ink sm:grid-cols-2">
        {MODE_OPTIONS.map((m, i) => {
          const current = activeMode === m.mode
          return (
            <button
              key={m.mode}
              type="button"
              onClick={() => choose(m.mode, { returnTo: '/map', then: () => navigate('/map') })}
              aria-busy={pending === m.mode || undefined}
              aria-describedby={`mode-${m.mode}-status`}
              className={cn(
                'group/arrow flex min-h-60 flex-col text-left transition-colors',
                i > 0 && 'border-t-2 border-ink sm:border-t-0 sm:border-l-2',
                m.activeClass,
                'hover:bg-sheet',
              )}
            >
              <span className="flex flex-1 flex-col gap-3 p-6">
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="grid size-16 place-items-center border-2 border-ink bg-sheet">
                    <Icon name={m.icon} accent={m.accent} className="size-10" />
                  </span>
                  {current && <Badge tone="ink">Current</Badge>}
                </span>
                <span className="font-display text-3xl uppercase">{m.title} mode</span>
                <span className="leading-snug">{m.blurb}</span>
              </span>
              <span className="flex items-stretch border-t-2 border-ink">
                <span id={`mode-${m.mode}-status`} className="flex flex-1 items-center px-6 py-3 text-xs font-bold tracking-[0.1em] uppercase">
                  {pending === m.mode ? 'Switching…' : status(m.mode)}
                </span>
                <span className="grid w-14 place-items-center border-l-2 border-ink bg-sheet" aria-hidden>
                  <Icon name="arrow-up-right" accent="none" strokeWidth={2.2} className="size-5" />
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      <div className="mt-auto flex flex-col items-center gap-2 pt-2">
        {tripCount > 0 && (
          <Link to="/trips" className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
            <Icon name="suitcase" className="size-5" />
            Manage my trips ({tripCount})
          </Link>
        )}
        <Link to="/profile" className={buttonClasses({ variant: 'ghost' })}>
          Not sure yet? Look around first
        </Link>
      </div>
    </Screen>
  )
}
