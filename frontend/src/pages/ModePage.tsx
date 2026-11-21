// /mode: "How are you exploring today?" Pick Tourist or Local. Shown right after onboarding, and any
// time someone wants to choose. Choosing a mode for the first time runs its short setup.
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
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
    <Screen className="gap-6 md:max-w-xl">
      <MascotSays mood={welcome ? 'cheer' : 'wave'} className="pt-2">
        {welcome ? (
          <p>
            You’re all set, <strong>{account.name}</strong>! 🎉 Your profile’s saved. So… how are you exploring today?
          </p>
        ) : (
          <p>How are you exploring today, {account.name}?</p>
        )}
      </MascotSays>

      <header>
        <h1 className="text-4xl text-navy">Pick your mode</h1>
        <p className="mt-1">Same you, two ways to explore. Switch any time from the top of the app.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
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
                'flex min-h-52 flex-col items-start gap-2 rounded-[1.6rem_1.4rem_1.7rem_1.3rem] border-[3px] border-navy p-5 text-left transition-transform duration-100 active:scale-[0.97]',
                i === 0 ? '-rotate-1' : 'rotate-1',
                m.activeClass,
              )}
            >
              <span className="flex w-full items-start justify-between gap-2">
                <span className="text-5xl" aria-hidden>
                  {m.emoji}
                </span>
                {current && <Badge tone="navy">Current</Badge>}
              </span>
              <span className="font-display text-3xl uppercase">{m.title} mode</span>
              <span className="leading-snug">{m.blurb}</span>
              <span id={`mode-${m.mode}-status`} className="mt-auto pt-2 font-type text-xs tracking-wider uppercase">
                {pending === m.mode ? 'Switching…' : status(m.mode)} →
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
