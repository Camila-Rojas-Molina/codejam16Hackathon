// /profile: one person, one account, two ways to explore.
// The universal profile, each mode's context, what other people can see, and privacy controls.
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/ui/BottomNav'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { Toggle } from '../components/ui/Fields'
import { modeMeta } from '../features/onboarding/options'
import ModeSwitch from '../features/profile/components/ModeSwitch'
import SummaryList from '../features/profile/components/SummaryList'
import UniversalSummary from '../features/profile/components/UniversalSummary'
import { localItems, stepIdOf } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { activeTrip, formatTripDates } from '../features/profile/model'
import {
  ACCESSIBILITY_OPTIONS,
  ATTRACTION_OPTIONS,
  ENERGY_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TOPIC_OPTIONS,
  labelsFor,
  optionFor,
} from '../features/profile/options'
import { publicProfile } from '../features/profile/privacy'
import { useStore } from '../store/useStore'

const sectionTitle = 'mb-3 text-3xl text-navy'

function ChipList({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="font-type text-xs tracking-wider uppercase">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {items.map((x) => (
          <li key={x} className="rounded-full border-2 border-navy bg-paper px-2.5 py-0.5 text-sm">
            {x}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ProfilePage() {
  const { account, profile, saveUniversal, saveTrip, clearLocal, deleteAccount } = useStore()
  const navigate = useNavigate()
  const saved = (useLocation().state as { saved?: string } | null)?.saved
  const [confirm, setConfirm] = useState<null | 'local' | 'access' | 'account'>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(saved ?? '')

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile) || !profile.universal) return <Navigate to="/onboarding/questions" replace />

  const universal = profile.universal
  const trip = activeTrip(profile)
  const view = publicProfile(account, profile)
  const editLocal: SetupNavState = { activate: false, returnTo: '/profile' }

  async function act(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const setShareAccess = (on: boolean) =>
    act(
      () => saveUniversal({ ...universal, accessibility: { ...universal.accessibility, shareWithMatches: on } }),
      on ? 'Your access needs will be shown to matches.' : 'Your access needs are private again.',
    )

  // Removes accessibility answers everywhere: the universal profile and every trip.
  const clearAccess = () =>
    act(async () => {
      await saveUniversal({ ...universal, accessibility: { needs: [], notes: '', shareWithMatches: false } })
      for (const t of profile.tourist.trips) {
        if (t.accessibility.needs.length > 0 || t.accessibility.notes) await saveTrip({ ...t, accessibility: { needs: [], notes: '' } })
      }
    }, 'Accessibility info removed.')

  const hasAccessInfo =
    universal.accessibility.needs.length > 0 ||
    universal.accessibility.notes.trim() !== '' ||
    profile.tourist.trips.some((t) => t.accessibility.needs.length > 0 || t.accessibility.notes.trim() !== '')

  const energy = optionFor(ENERGY_OPTIONS, view.energy)
  const pace = optionFor(PACE_OPTIONS, view.pace)

  return (
    <Screen withNav className="gap-8 md:max-w-xl">
      <header className="flex items-center gap-4">
        <span className="grid size-20 shrink-0 place-items-center rounded-full border-4 border-navy bg-paper text-4xl" aria-hidden>
          {account.avatar}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-4xl text-navy">{account.name}</h1>
          <Link to="/onboarding" state={{ from: 'profile' }} className="font-semibold underline underline-offset-4">
            Edit name & avatar
          </Link>
        </div>
      </header>

      <ModeSwitch returnTo="/profile" />

      <p className="sr-only" aria-live="polite">
        {message}
      </p>
      {saved && (
        <p className="rounded-2xl border-[3px] border-navy bg-sun px-4 py-2 text-ink" role="status">
          ✓ {saved}
        </p>
      )}

      {/* What other people see */}
      <section aria-labelledby="public-card">
        <h2 id="public-card" className={sectionTitle}>
          What matches see
        </h2>
        <Card tone="bubble-light" tilt="right" className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-5xl" aria-hidden>
              {view.avatar}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-3xl uppercase">{view.name}</p>
              {view.mode && <Badge tone="navy">{`${modeMeta(view.mode).emoji} ${modeMeta(view.mode).title} mode`}</Badge>}
            </div>
          </div>
          {view.tourist && (
            <p>
              Visiting <strong>{view.tourist.destination}</strong>
              {view.tourist.when && ` · ${view.tourist.when}`}
            </p>
          )}
          {view.local && (
            <p>
              Local in <strong>{view.local.homeCity}</strong>
              {view.local.knownAreas.length > 0 && ` · knows ${view.local.knownAreas.join(', ')}`}
            </p>
          )}
          {(energy || pace) && (
            <p>
              {energy && `${energy.emoji} ${energy.label}`}
              {energy && pace && ' · '}
              {pace && `${pace.emoji} ${pace.label} pace`}
            </p>
          )}
          <ChipList label="Into" items={labelsFor(INTEREST_OPTIONS, view.tourist?.interests ?? view.interests)} />
          <ChipList label="Loves visiting" items={labelsFor(ATTRACTION_OPTIONS, view.tourist?.activities ?? view.attractions)} />
          <ChipList label="Chat topics" items={labelsFor(TOPIC_OPTIONS, view.topics)} />
          <ChipList label="Speaks" items={view.languages} />
          {view.idealAdventureNote && <p className="italic">“{view.idealAdventureNote}”</p>}
          {view.accessibilityNeeds && <ChipList label="Access needs (shared)" items={labelsFor(ACCESSIBILITY_OPTIONS, view.accessibilityNeeds)} />}
          <p className="border-t-[3px] border-dashed border-navy pt-2 text-sm">
            🔒 Budget, food, transport, your neighbourhood and private notes are never shown.
          </p>
        </Card>
      </section>

      {/* Tourist mode */}
      <section aria-labelledby="tourist-ctx">
        <h2 id="tourist-ctx" className={sectionTitle}>
          🧳 Tourist mode
        </h2>
        <Card tone="sun" tilt="left">
          {trip ? (
            <>
              <p className="font-type text-xs tracking-wider uppercase">Active trip</p>
              <p className="mt-1 font-display text-3xl break-words uppercase">{trip.destination}</p>
              <p>{formatTripDates(trip)}</p>
              <p className="mt-2 text-sm">
                {profile.tourist.trips.length} {profile.tourist.trips.length === 1 ? 'trip' : 'trips'} saved. Each keeps its own
                budget, interests and needs.
              </p>
            </>
          ) : (
            <p>No trips yet. When you’re visiting somewhere, set one up and MIGO will find you a local.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {trip && (
              <Link to="/trips" className={buttonClasses({ variant: 'secondary' })}>
                Manage trips
              </Link>
            )}
            <Link to="/mode/tourist" state={{ activate: false, returnTo: '/profile' } satisfies SetupNavState} className={buttonClasses()}>
              {trip ? 'Plan another' : 'Plan a trip'}
            </Link>
          </div>
        </Card>
      </section>

      {/* Local mode */}
      <section aria-labelledby="local-ctx">
        <h2 id="local-ctx" className={sectionTitle}>
          📍 Local mode
        </h2>
        {profile.local ? (
          <>
            <SummaryList
              title={profile.local.homeCity}
              items={localItems(profile.local)}
              onEdit={() => navigate('/mode/local', { state: editLocal })}
            />
            {confirm === 'local' ? (
              <Card className="mt-3" role="alertdialog" aria-label="Remove local profile?">
                <p className="font-semibold">Remove your local profile? Your general profile and trips stay.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => act(clearLocal, 'Local profile removed.')}>
                    Yes, remove
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                    Keep it
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/mode/local" state={editLocal} className={buttonClasses({ variant: 'secondary' })}>
                  Edit local profile
                </Link>
                <Button variant="ghost" onClick={() => setConfirm('local')}>
                  Remove
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card tone="bubble" tilt="right">
            <p>At home? Set up Local mode to show visitors your favourite spots. It takes about a minute.</p>
            <Link to="/mode/local" state={editLocal} className={buttonClasses({ className: 'mt-4' })}>
              Set up Local mode
            </Link>
          </Card>
        )}
      </section>

      {/* Universal profile */}
      <section aria-labelledby="universal">
        <h2 id="universal" className={sectionTitle}>
          You, everywhere
        </h2>
        <p className="mb-4">Your personality and general preferences. Both modes use these as defaults.</p>
        <UniversalSummary universal={universal} onEdit={(stepId) => navigate(`/onboarding/questions?step=${stepIdOf(stepId)}`)} />
      </section>

      {/* Privacy */}
      <section aria-labelledby="privacy">
        <h2 id="privacy" className={sectionTitle}>
          Privacy
        </h2>
        <Card className="space-y-5">
          <Toggle
            label="Share my access needs with matches"
            description={
              universal.accessibility.needs.length > 0
                ? `Currently: ${labelsFor(ACCESSIBILITY_OPTIONS, universal.accessibility.needs).join(', ')}. Notes are never shared.`
                : 'You haven’t added any. Nothing is shared.'
            }
            checked={universal.accessibility.shareWithMatches}
            onChange={setShareAccess}
          />
          {hasAccessInfo &&
            (confirm === 'access' ? (
              <div role="alertdialog" aria-label="Remove accessibility info?" className="rounded-2xl border-[3px] border-dashed border-navy p-3">
                <p className="font-semibold">Remove all accessibility info from your profile and trips?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={clearAccess}>
                    Yes, remove
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setConfirm('access')}>
                Remove my accessibility info
              </Button>
            ))}
          <p className="text-sm">
            🔒 Private answers (budget, food and dietary needs, transport, neighbourhood, hidden gems, notes) only help
            MIGO choose places and partners. They’re never shown to anyone. Change any of them above, any time.
          </p>
        </Card>
      </section>

      {/* Account */}
      <section aria-labelledby="account" className="pb-4">
        <h2 id="account" className={sectionTitle}>
          Account
        </h2>
        {confirm === 'account' ? (
          <Card role="alertdialog" aria-label="Delete your account?">
            <p className="font-semibold">
              Delete your account? Your profile, trips and local details are erased for good. This can’t be undone.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await deleteAccount()
                  navigate('/', { replace: true })
                }}
              >
                Delete everything
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setConfirm('account')}>
            Delete my account
          </Button>
        )}
      </section>

      <BottomNav />
    </Screen>
  )
}
