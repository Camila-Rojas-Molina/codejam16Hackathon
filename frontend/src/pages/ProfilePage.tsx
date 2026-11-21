// PROFILE: one person, one account, two ways to explore.
//   Overview       your card, home city, cities discovered, both modes, points
//   My answers     the questionnaire (each answer editable)
//   Avatar & Migo  name, avatar and Migo's wardrobe
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { PointsIcon } from '../components/illustrations/Icons'
import { Mascot } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { TextField } from '../components/ui/Fields'
import { NAME_MAX_LENGTH, modeMeta } from '../features/onboarding/options'
import SummaryList from '../features/profile/components/SummaryList'
import UniversalSummary from '../features/profile/components/UniversalSummary'
import { localItems, stepIdOf } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { activeTrip, formatTripDates, pointsBalance, pointsEarned } from '../features/profile/model'
import {
  ACCESSIBILITY_OPTIONS,
  ATTRACTION_OPTIONS,
  CITY_MAX_LENGTH,
  ENERGY_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TOPIC_OPTIONS,
  labelsFor,
  optionFor,
} from '../features/profile/options'
import { publicProfile } from '../features/profile/privacy'
import { SHOP_ITEMS, SLOT_LABELS } from '../features/rewards/shop'
import { AVATAR_LIST } from '../lib/avatars'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

type Tab = 'overview' | 'answers' | 'style'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'answers', label: 'My answers' },
  { id: 'style', label: 'Avatar & Migo' },
]

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

// ---- Overview -----------------------------------------------------------------------------------

function CitiesDiscovered() {
  const { profile, addCity, removeCity } = useStore()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const cities = profile?.universal?.citiesDiscovered ?? []

  async function add(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      const before = cities.length
      const next = await addCity(clean)
      setMessage((next.universal?.citiesDiscovered.length ?? 0) > before ? `Added ${clean}.` : `${clean} is already in your passport.`)
      setName('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Couldn’t add that city.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="cities" aria-labelledby="cities-title" className="scroll-mt-24">
      <h2 id="cities-title" className={sectionTitle}>
        Cities discovered
      </h2>
      <Card className="space-y-4">
        {cities.length === 0 ? (
          <p>No stamps yet. Add the cities you’ve explored. They show on your profile and help matches find common ground.</p>
        ) : (
          <ul className="flex flex-wrap gap-3" aria-label="Your cities">
            {cities.map((c, i) => (
              <li
                key={c.id}
                className={cn(
                  'group flex items-center gap-2 rounded-xl border-4 border-double border-navy bg-bubble-light py-1.5 pr-1.5 pl-3',
                  i % 3 === 0 ? '-rotate-2' : i % 3 === 1 ? 'rotate-1' : '-rotate-1',
                )}
              >
                <span className="font-display text-lg uppercase">{c.name}</span>
                {c.source !== 'manual' && <span className="text-xs">({c.source === 'trip' ? 'from a trip' : 'from a quest'})</span>}
                <button
                  type="button"
                  onClick={async () => {
                    await removeCity(c.id)
                    setMessage(`Removed ${c.name}.`)
                  }}
                  aria-label={`Remove ${c.name}`}
                  className="grid size-8 place-items-center rounded-full font-type text-lg hover:bg-paper"
                >
                  <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex items-end gap-2">
          <TextField
            label="Add a city"
            value={name}
            onChange={setName}
            maxLength={CITY_MAX_LENGTH}
            placeholder="e.g. Lisbon"
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={!name.trim() || busy} className="min-h-14">
            Add
          </Button>
        </form>
        <p className="text-sm" aria-live="polite">
          {message || '👀 Public. Shown on your profile card.'}
        </p>
      </Card>
    </section>
  )
}

function Overview() {
  const { account, profile, clearLocal } = useStore()
  const navigate = useNavigate()
  const [confirmLocal, setConfirmLocal] = useState(false)
  if (!account || !profile?.universal) return null

  const universal = profile.universal
  const trip = activeTrip(profile)
  const view = publicProfile(account, profile)
  const energy = optionFor(ENERGY_OPTIONS, view.energy)
  const pace = optionFor(PACE_OPTIONS, view.pace)
  const editLocal: SetupNavState = { activate: false, returnTo: '/profile' }
  const ledger = [...profile.rewards.ledger].reverse().slice(0, 5)

  return (
    <div className="space-y-10">
      {!universal.homeCity.trim() && (
        <Card tone="sun" className="flex flex-wrap items-center gap-3">
          <p className="flex-1">🏠 Where do you live? Add your home city so visitors can find you as a local.</p>
          <Link to="/onboarding/questions?step=home" className={buttonClasses()}>
            Add home city
          </Link>
        </Card>
      )}

      {/* What other people see */}
      <section aria-labelledby="public-card">
        <h2 id="public-card" className={sectionTitle}>
          What matches see
        </h2>
        <Card tone="bubble-light" tilt="right" className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar avatar={view.avatar} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-3xl uppercase">{view.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {view.mode && <Badge tone="navy">{`${modeMeta(view.mode).emoji} ${modeMeta(view.mode).title} mode`}</Badge>}
                {view.homeCity && <Badge tone="outline">🏠 {view.homeCity}</Badge>}
              </div>
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
          <ChipList label="Cities discovered" items={view.citiesDiscovered} />
          {view.dogStance && (
            <p>
              {view.dog ? `🐕 Exploring with ${view.dog.name || 'their dog'}` : view.dogStance === 'loves-dogs' ? '🦴 Loves dogs' : '🐾 Fine with dogs'}
            </p>
          )}
          {view.idealAdventureNote && <p className="italic">“{view.idealAdventureNote}”</p>}
          {view.accessibilityNeeds && <ChipList label="Access needs (shared)" items={labelsFor(ACCESSIBILITY_OPTIONS, view.accessibilityNeeds)} />}
          <p className="border-t-[3px] border-dashed border-navy pt-2 text-sm">
            🔒 Budget, food, transport, your neighbourhood and private notes are never shown.
          </p>
        </Card>
      </section>

      <CitiesDiscovered />

      {/* Both modes */}
      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className={sectionTitle}>
          Your two modes
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card tone="sun" tilt="left">
            <p className="font-type text-xs tracking-wider uppercase">🧳 Tourist mode</p>
            {trip ? (
              <>
                <p className="mt-1 font-display text-3xl break-words uppercase">{trip.destination}</p>
                <p>{formatTripDates(trip)}</p>
                <p className="mt-2 text-sm">
                  {profile.tourist.trips.length} {profile.tourist.trips.length === 1 ? 'trip' : 'trips'} saved, each with its own
                  budget, interests and needs.
                </p>
              </>
            ) : (
              <p className="mt-1">No trips yet. Visiting somewhere? Set one up and MIGO will find you a local.</p>
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

          <Card tone="bubble" tilt="right">
            <p className="font-type text-xs tracking-wider uppercase">📍 Local mode</p>
            {profile.local ? (
              <>
                <p className="mt-1 font-display text-3xl break-words uppercase">{profile.local.homeCity}</p>
                <p className="text-sm">Hosting visitors · {profile.local.knownAreas.join(', ') || 'all over town'}</p>
              </>
            ) : (
              <p className="mt-1">At home? Set up Local mode to show visitors your favourite spots. It takes about a minute.</p>
            )}
            {confirmLocal ? (
              <div className="mt-4 rounded-2xl border-[3px] border-dashed border-navy p-3" role="alertdialog" aria-label="Remove local profile?">
                <p className="font-semibold">Remove your local profile? Your general profile and trips stay.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      await clearLocal()
                      setConfirmLocal(false)
                    }}
                  >
                    Yes, remove
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmLocal(false)} autoFocus>
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/mode/local" state={editLocal} className={buttonClasses({ variant: profile.local ? 'secondary' : 'primary' })}>
                  {profile.local ? 'Edit local profile' : 'Set up Local mode'}
                </Link>
                {profile.local && (
                  <Button variant="ghost" onClick={() => setConfirmLocal(true)}>
                    Remove
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
        {profile.local && (
          <SummaryList
            className="mt-4"
            title={`Hosting in ${profile.local.homeCity}`}
            items={localItems(profile.local)}
            onEdit={() => navigate('/mode/local', { state: editLocal })}
          />
        )}
      </section>

      {/* Points */}
      <section id="points" aria-labelledby="points-title" className="scroll-mt-24">
        <h2 id="points-title" className={sectionTitle}>
          Points
        </h2>
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <PointsIcon className="size-12" />
            <div>
              <p className="font-display text-4xl leading-none">{pointsBalance(profile.rewards).toLocaleString()}</p>
              <p className="text-sm">to spend · {pointsEarned(profile.rewards).toLocaleString()} earned in total</p>
            </div>
          </div>
          {ledger.length > 0 ? (
            <ul className="divide-y-2 divide-dashed divide-navy/40" aria-label="Recent points activity">
              {ledger.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2">
                  <span>{e.reason === 'purchase' ? `🛍️ Bought ${e.label}` : `🏅 ${e.label}`}</span>
                  <span className="font-type tabular-nums">{e.amount > 0 ? `+${e.amount}` : e.amount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Complete quests to earn your first points.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to="/quests" className={buttonClasses({ variant: 'secondary' })}>
              Quests
            </Link>
            <Link to="/shop" className={buttonClasses({ variant: 'secondary' })}>
              Shop
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}

// ---- Avatar & Migo ------------------------------------------------------------------------------

function Style() {
  const { account, profile, updateAccount, setEquipped } = useStore()
  const [name, setName] = useState(account?.name ?? '')
  const [avatar, setAvatar] = useState(account?.avatar ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!account || !profile) return null

  const owned = SHOP_ITEMS.filter((i) => profile.rewards.owned.includes(i.id))
  const dirty = name.trim() !== account.name || avatar !== account.avatar

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dirty) return
    setBusy(true)
    try {
      await updateAccount({ name: name.trim(), avatar })
      setMessage('Saved!')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Couldn’t save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="you-title">
        <h2 id="you-title" className={sectionTitle}>
          Name & avatar
        </h2>
        <Card>
          <form onSubmit={save} className="space-y-5">
            <TextField label="Name" value={name} onChange={setName} maxLength={NAME_MAX_LENGTH} autoComplete="given-name" />
            <fieldset>
              <legend className="mb-2 font-type text-sm tracking-wider uppercase">Avatar</legend>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
                {AVATAR_LIST.map((a) => (
                  <label
                    key={a.id}
                    className="relative grid cursor-pointer place-items-center rounded-2xl border-[3px] border-transparent p-1 transition-transform active:scale-95 has-checked:border-navy has-checked:bg-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy"
                  >
                    <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} className="sr-only" />
                    <img src={a.src} alt="" className="aspect-square w-full object-contain" />
                    <span className="sr-only">{a.alt}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!dirty || !name.trim() || busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <p aria-live="polite">{message}</p>
            </div>
          </form>
        </Card>
      </section>

      <section aria-labelledby="wardrobe-title">
        <h2 id="wardrobe-title" className={sectionTitle}>
          Migo’s wardrobe
        </h2>
        <Card className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="grid place-items-center rounded-[1.4rem] border-[3px] border-navy bg-bubble-light p-4">
            <Mascot mood="cheer" accessories={profile.rewards.equipped} className="h-40" label="Migo wearing your accessories" />
          </div>
          <div>
            {owned.length === 0 ? (
              <p>Migo’s wardrobe is empty. Earn points from quests and pick something out in the shop.</p>
            ) : (
              <ul className="space-y-2">
                {owned.map((item) => {
                  const wearing = profile.rewards.equipped[item.slot] === item.id
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-2xl border-2 border-navy/40 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{item.name}</span>
                        <span className="text-xs">{SLOT_LABELS[item.slot]}</span>
                      </span>
                      <Button size="md" variant={wearing ? 'secondary' : 'sun'} onClick={() => setEquipped(item.id, !wearing)} aria-label={`${wearing ? 'Take off' : 'Put on'} ${item.name}`}>
                        {wearing ? 'Take off' : 'Put on'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link to="/shop" className={buttonClasses({ className: 'mt-4' })}>
              Visit the shop
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}

// ---- Page ---------------------------------------------------------------------------------------

export default function ProfilePage() {
  const { account, profile } = useStore()
  const navigate = useNavigate()
  const { hash, state } = useLocation()
  const [params] = useSearchParams()
  const saved = (state as { saved?: string } | null)?.saved
  const tab: Tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as Tab

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile) || !profile.universal) return <Navigate to="/onboarding/questions" replace />

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-4">
        <Avatar avatar={account.avatar} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-4xl text-navy sm:text-5xl">{account.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3">
            {profile.universal.homeCity && <span>🏠 {profile.universal.homeCity}</span>}
            <span>🗺️ {profile.universal.citiesDiscovered.length} cities</span>
            <span>⭐ {pointsBalance(profile.rewards).toLocaleString()} points</span>
          </p>
        </div>
        <Mascot mood="wave" accessories={profile.rewards.equipped} className="hidden h-28 sm:block" />
      </header>

      {saved && (
        <p className="rounded-2xl border-[3px] border-navy bg-sun px-4 py-2 text-ink" role="status">
          ✓ {saved}
        </p>
      )}

      <nav aria-label="Profile sections" className="flex gap-1.5 overflow-x-auto rounded-full border-[3px] border-navy bg-paper p-1.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={t.id === 'overview' ? '/profile' : `/profile?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              'flex min-h-12 flex-1 items-center justify-center rounded-full border-[3px] px-3 font-type text-xs tracking-wider whitespace-nowrap uppercase transition-transform active:scale-95 sm:text-sm',
              tab === t.id ? 'border-navy bg-sun text-ink' : 'border-transparent text-navy hover:bg-bubble-light',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && <Overview />}
      {tab === 'answers' && (
        <section aria-labelledby="answers-title" className="space-y-4">
          <h2 id="answers-title" className={sectionTitle}>
            You, everywhere
          </h2>
          <p>Your personality and general preferences. Both modes use these as defaults, and switching modes never changes them.</p>
          <UniversalSummary universal={profile.universal} onEdit={(stepId) => navigate(`/onboarding/questions?step=${stepIdOf(stepId)}`)} />
        </section>
      )}
      {tab === 'style' && <Style />}
    </div>
  )
}
