// /trips: every Tourist mode trip on the account. Pick the active one, edit, delete, or plan another.
// Trips are independent of each other and of the universal profile.
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { companionText } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { formatTripDates, tripTiming, type TripTiming } from '../features/profile/model'
import type { TouristTrip } from '../features/profile/types'
import { useStore } from '../store/useStore'

const TIMING: Record<TripTiming, { label: string; tone: 'sun' | 'bubble' | 'outline' | 'bubble-light' }> = {
  now: { label: 'Happening now', tone: 'sun' },
  upcoming: { label: 'Upcoming', tone: 'bubble' },
  past: { label: 'Past', tone: 'outline' },
  unknown: { label: 'Dates flexible', tone: 'bubble-light' },
}

// Active trip first, then the soonest, then flexible ones, then past trips.
const timingOrder: Record<TripTiming, number> = { now: 0, upcoming: 1, unknown: 2, past: 3 }

export default function TripsPage() {
  const { account, profile, activateTrip, deleteTrip } = useStore()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile)) return <Navigate to="/onboarding/questions" replace />

  const { trips, activeTripId } = profile.tourist
  const sorted = [...trips].sort((a, b) => {
    if (a.id === activeTripId) return -1
    if (b.id === activeTripId) return 1
    const t = timingOrder[tripTiming(a)] - timingOrder[tripTiming(b)]
    return t !== 0 ? t : (a.dates.start || '9999').localeCompare(b.dates.start || '9999')
  })

  async function run(tripId: string, action: () => Promise<unknown>, done: string) {
    setBusy(tripId)
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const newTripState: SetupNavState = { activate: false, returnTo: '/trips' }

  return (
    <Screen withNav className="gap-6 md:max-w-xl">
      <Button variant="ghost" className="self-start px-0" onClick={() => navigate('/profile')}>
        ← Profile
      </Button>
      <header>
        <h1 className="text-4xl text-navy">My trips</h1>
        <p className="mt-1">
          Tourist mode uses your <strong>active trip</strong>. Each trip keeps its own details, so planning Tokyo never
          overwrites Paris.
        </p>
      </header>

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {sorted.length === 0 && (
        <Card tone="bubble-light">
          <p>No trips yet. Planning one takes about a minute, and your profile fills in most of it.</p>
        </Card>
      )}

      <ul className="space-y-4">
        {sorted.map((trip: TouristTrip, i) => {
          const active = trip.id === activeTripId
          const timing = TIMING[tripTiming(trip)]
          return (
            <li key={trip.id}>
              <Card tone={active ? 'sun' : 'paper'} tilt={i % 2 === 0 ? 'left' : 'right'}>
                <div className="flex flex-wrap items-center gap-2">
                  {active && <Badge tone="navy">✓ Active trip</Badge>}
                  <Badge tone={timing.tone}>{timing.label}</Badge>
                </div>
                <h2 className="mt-2 text-3xl break-words">{trip.destination}</h2>
                <p className="mt-1">
                  {formatTripDates(trip)} · {companionText(trip)}
                </p>

                {confirming === trip.id ? (
                  <div className="mt-4 rounded-2xl border-[3px] border-dashed border-navy p-3" role="alertdialog" aria-label="Delete this trip?">
                    <p className="font-semibold">Delete your {trip.destination} trip? This can’t be undone.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="md" onClick={() => run(trip.id, () => deleteTrip(trip.id), `Deleted ${trip.destination}.`)} disabled={busy === trip.id}>
                        Yes, delete
                      </Button>
                      <Button size="md" variant="secondary" onClick={() => setConfirming(null)} autoFocus>
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!active && (
                      <Button
                        size="md"
                        variant="sun"
                        disabled={busy === trip.id}
                        onClick={() => run(trip.id, () => activateTrip(trip.id), `${trip.destination} is now your active trip.`)}
                      >
                        Make active
                      </Button>
                    )}
                    <Link to={`/mode/tourist/${trip.id}`} className={buttonClasses({ variant: 'secondary' })} aria-label={`Edit ${trip.destination} trip`}>
                      Edit
                    </Link>
                    <Button variant="ghost" onClick={() => setConfirming(trip.id)} aria-label={`Delete ${trip.destination} trip`}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>

      <Link to="/mode/tourist" state={newTripState} className={buttonClasses({ size: 'lg', fullWidth: true })}>
        Plan a new trip
      </Link>

      <BottomNav />
    </Screen>
  )
}
