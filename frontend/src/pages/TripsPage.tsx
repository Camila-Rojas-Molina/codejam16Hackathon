// /trips: every Tourist mode trip on the account. Pick the active one, edit, delete, or plan another.
// Trips are independent of each other and of the universal profile.
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import Badge, { type BadgeTone } from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { companionText } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { formatTripDates, tripTiming, type TripTiming } from '../features/profile/model'
import type { TouristTrip } from '../features/profile/types'
import { useStore } from '../store/useStore'

const TIMING: Record<TripTiming, { label: string; tone: BadgeTone }> = {
  now: { label: 'Happening now', tone: 'saffron' },
  upcoming: { label: 'Upcoming', tone: 'teal' },
  past: { label: 'Past', tone: 'outline' },
  unknown: { label: 'Dates flexible', tone: 'sandy' },
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button variant="ghost" icon="arrow-left" className="self-start px-0" onClick={() => navigate('/profile')}>
        Profile
      </Button>
      <PageHeader
        eyebrow="Tourist mode"
        title="My trips"
        description={
          <>
            Tourist mode uses your <strong>active trip</strong>. Each trip keeps its own details, so planning Tokyo never overwrites Paris.
          </>
        }
        aside={<Mascot pose="glide" className="h-28" />}
      />

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {sorted.length === 0 && (
        <Card tone="teal-soft">
          <p>No trips yet. Planning one takes about a minute, and your profile fills in most of it.</p>
        </Card>
      )}

      <ul className="space-y-5">
        {sorted.map((trip: TouristTrip) => {
          const active = trip.id === activeTripId
          const timing = TIMING[tripTiming(trip)]
          return (
            <li key={trip.id}>
              <Card tone={active ? 'saffron-soft' : 'sheet'} lifted={active}>
                <div className="flex flex-wrap items-center gap-2">
                  {active && (
                    <Badge tone="ink" icon="check">
                      Active trip
                    </Badge>
                  )}
                  <Badge tone={timing.tone}>{timing.label}</Badge>
                </div>
                <h2 className="mt-3 flex items-center gap-2 text-3xl break-words">
                  <Icon name="pin" accent="sienna" className="size-7" />
                  {trip.destination}
                </h2>
                <p className="mt-1 font-semibold">
                  {formatTripDates(trip)} · {companionText(trip)}
                </p>

                {confirming === trip.id ? (
                  <div className="mt-4 border-2 border-dashed border-ink bg-sheet p-3" role="alertdialog" aria-label="Delete this trip?">
                    <p className="font-semibold">Delete your {trip.destination} trip? This can’t be undone.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="md" variant="danger" onClick={() => run(trip.id, () => deleteTrip(trip.id), `Deleted ${trip.destination}.`)} disabled={busy === trip.id}>
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
                        variant="primary"
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
        <Icon name="plus" accent="none" strokeWidth={2.4} className="size-5" />
        Plan a new trip
      </Link>

    </div>
  )
}
