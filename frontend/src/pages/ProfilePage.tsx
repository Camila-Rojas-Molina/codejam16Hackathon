// PROFILE: one person, one account, two ways to explore.
//   Overview       your card, home city and cities discovered (atlas), both modes, points
//   My answers     the questionnaire (each answer editable)
//   Avatar & Migo  name, avatar and Migo's wardrobe
// Every profile box is straight-edged: ruled cells, square corners.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import Icon, { type IconName } from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses, buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { PrivacyNote, TextField } from '../components/ui/Fields'
import { NAME_MAX_LENGTH, modeMeta } from '../features/onboarding/options'
import CityCollection from '../features/places/components/CityCollection'
import HomeCityPicker from '../features/places/components/HomeCityPicker'
import SummaryList from '../features/profile/components/SummaryList'
import UniversalSummary from '../features/profile/components/UniversalSummary'
import { localItems, stepIdOf } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { activeTrip, cityLabel, formatTripDates, homeCityFields, needsHomePick, pointsBalance, pointsEarned } from '../features/profile/model'
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
import { SHOP_ITEMS, SLOT_LABELS } from '../features/rewards/shop'
import { AVATAR_LIST, resolveAvatar } from '../lib/avatars'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

type Tab = 'overview' | 'answers' | 'style'
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'id' },
  { id: 'answers', label: 'My answers', icon: 'clipboard' },
  { id: 'style', label: 'Avatar & Migo', icon: 'smile' },
]

const JUMPS: { id: string; label: string; icon: IconName }[] = [
  { id: 'seen', label: 'Public card', icon: 'eye' },
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'cities', label: 'Cities', icon: 'globe' },
  { id: 'modes', label: 'Modes', icon: 'shuffle' },
  { id: 'points', label: 'Points', icon: 'coin' },
]

function SectionTitle({ id, icon, children }: { id: string; icon: IconName; children: string }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-3 text-3xl">
      <Icon name={icon} className="size-8" />
      {children}
    </h2>
  )
}

function ChipList({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((x) => (
          <li key={x} className="border-2 border-ink bg-sheet px-2 py-0.5 text-sm font-semibold">
            {x}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---- Overview -----------------------------------------------------------------------------------

function Overview() {
  const { account, profile, addCity, removeCity, clearLocal, saveUniversal } = useStore()
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
  const mode = view.mode ? modeMeta(view.mode) : null

  const homeMissing = !universal.homeCityPlace

  return (
    <div className="@container space-y-12">
      {homeMissing && (
        <Card tone="saffron-soft" className="flex flex-wrap items-center gap-4">
          <Icon name="house" className="size-8" />
          <p className="min-w-0 flex-1 font-semibold">
            {needsHomePick(universal)
              ? `Pin ${universal.homeCity.trim()} on the map so visitors can find you as a local.`
              : 'Where do you live? Add your home city so visitors can find you as a local.'}
          </p>
          <a href="#home" className={buttonClasses()}>
            {needsHomePick(universal) ? 'Pick on map' : 'Add home city'}
          </a>
        </Card>
      )}

      <nav aria-label="On this page" className="-mt-4 flex flex-wrap gap-2">
        {JUMPS.map((j) => (
          <a
            key={j.id}
            href={`#${j.id}`}
            className="flex min-h-11 items-center gap-1.5 border-2 border-ink bg-sheet px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron-soft"
          >
            <Icon name={j.icon} className="size-5" />
            {j.label}
          </a>
        ))}
      </nav>

      {/* What other people see */}
      <section id="seen" aria-labelledby="public-card" className="scroll-mt-24">
        <SectionTitle id="public-card" icon="eye">
          What matches see
        </SectionTitle>
        <article className="sheet-grain border-2 border-ink shadow-block">
          <header className="flex items-stretch border-b-2 border-ink">
            <div className="grid w-28 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft p-2">
              <Avatar avatar={view.avatar} size="lg" className="border-0 bg-transparent" />
            </div>
            <div className="min-w-0 flex-1 p-4">
              <p className="truncate font-display text-3xl uppercase">{view.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mode && (
                  <Badge tone={view.mode === 'local' ? 'teal' : 'saffron'} icon={mode.icon}>
                    {mode.title} mode
                  </Badge>
                )}
                {view.homeCity && (
                  <Badge tone="outline" icon="house">
                    {view.homeCity}
                  </Badge>
                )}
              </div>
            </div>
          </header>
          <div className="grid gap-4 p-5 @xl:grid-cols-2 @xl:gap-x-8">
            {view.tourist && (
              <p className="flex items-center gap-2 font-semibold @xl:col-span-2">
                <Icon name="plane" className="size-5" />
                Visiting {view.tourist.destination}
                {view.tourist.when && ` · ${view.tourist.when}`}
              </p>
            )}
            {view.local && (
              <p className="flex items-center gap-2 font-semibold @xl:col-span-2">
                <Icon name="pin" accent="teal" className="size-5" />
                Local in {view.local.homeCity}
                {view.local.knownAreas.length > 0 && ` · knows ${view.local.knownAreas.join(', ')}`}
              </p>
            )}
            {(energy || pace) && (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold @xl:col-span-2">
                {energy && (
                  <span className="inline-flex items-center gap-1.5">
                    {energy.icon && <Icon name={energy.icon} className="size-5" />}
                    {energy.label}
                  </span>
                )}
                {pace && (
                  <span className="inline-flex items-center gap-1.5">
                    {pace.icon && <Icon name={pace.icon} className="size-5" />}
                    {pace.label} pace
                  </span>
                )}
              </p>
            )}
            <ChipList label="Into" items={labelsFor(INTEREST_OPTIONS, view.tourist?.interests ?? view.interests)} />
            <ChipList label="Loves visiting" items={labelsFor(ATTRACTION_OPTIONS, view.tourist?.activities ?? view.attractions)} />
            <ChipList label="Chat topics" items={labelsFor(TOPIC_OPTIONS, view.topics)} />
            <ChipList label="Speaks" items={view.languages} />
            <ChipList label="Cities discovered" items={view.citiesDiscovered} />
            {view.dogStance && (
              <p className="flex items-center gap-2 font-semibold">
                <Icon name={view.dog ? 'dog' : 'paw'} className="size-5" />
                {view.dog ? `Exploring with ${view.dog.name || 'their dog'}` : view.dogStance === 'loves-dogs' ? 'Loves dogs' : 'Fine with dogs'}
              </p>
            )}
            {view.idealAdventureNote && <p className="font-serif text-xl leading-snug @xl:col-span-2">“{view.idealAdventureNote}”</p>}
            {view.accessibilityNeeds && <ChipList label="Access needs (shared)" items={labelsFor(ACCESSIBILITY_OPTIONS, view.accessibilityNeeds)} />}
          </div>
          <p className="flex items-center gap-2 border-t-2 border-ink px-5 py-3 text-sm">
            <Icon name="lock" className="size-4" />
            Budget, food, transport, your neighbourhood and private notes are never shown.
          </p>
        </article>
      </section>

      {/* Home city: where they live. Separate from the cities they've explored. */}
      <section id="home" aria-labelledby="home-title" className="scroll-mt-24">
        <SectionTitle id="home-title" icon="house">
          Home city
        </SectionTitle>
        <p className="mb-4">Where you live, so visitors can meet you as a local. Picked by you, never from your location.</p>
        <HomeCityPicker
          label="Your home city"
          place={universal.homeCityPlace}
          legacyText={universal.homeCity}
          onPick={(place) => saveUniversal({ ...universal, ...homeCityFields(place) })}
          hint={
            <div className="space-y-2">
              <PrivacyNote kind="public">Matches see the city only, never a neighbourhood or address.</PrivacyNote>
              <p>Separate from the cities you’ve explored below. Moving? Change it any time.</p>
            </div>
          }
        />
      </section>

      {/* Cities discovered */}
      <section id="cities" aria-labelledby="cities-title" className="scroll-mt-24">
        <SectionTitle id="cities-title" icon="globe">
          Cities discovered
        </SectionTitle>
        <p className="mb-4">Pin every city you’ve explored. They’re public, so matches can find common ground.</p>
        <CityCollection cities={universal.citiesDiscovered} home={universal.homeCityPlace} onAdd={addCity} onRemove={removeCity} />
      </section>

      {/* Both modes */}
      <section id="modes" aria-labelledby="modes-title" className="scroll-mt-24">
        <SectionTitle id="modes-title" icon="shuffle">
          Your two modes
        </SectionTitle>
        <div className="grid border-2 border-ink shadow-block-sm @xl:grid-cols-2">
          <div className="bg-saffron-soft p-5">
            <p className="eyebrow flex items-center gap-2">
              <Icon name="suitcase" className="size-5" />
              Tourist mode
            </p>
            {trip ? (
              <>
                <p className="mt-2 font-display text-3xl break-words uppercase">{trip.destination}</p>
                <p className="font-semibold">{formatTripDates(trip)}</p>
                <p className="mt-2 text-sm">
                  {profile.tourist.trips.length} {profile.tourist.trips.length === 1 ? 'trip' : 'trips'} saved, each with its own budget, interests and needs.
                </p>
              </>
            ) : (
              <p className="mt-2">No trips yet. Visiting somewhere? Set one up and MIGO will find you a local.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {trip && (
                <Link to="/trips" className={buttonClasses({ variant: 'secondary' })}>
                  Manage trips
                </Link>
              )}
              <Link to="/mode/tourist" state={{ activate: false, returnTo: '/profile' } satisfies SetupNavState} className={buttonClasses()}>
                <Icon name="plus" accent="none" strokeWidth={2.4} className="size-4" />
                {trip ? 'Plan another' : 'Plan a trip'}
              </Link>
            </div>
          </div>

          <div className="border-t-2 border-ink bg-teal-soft p-5 @xl:border-t-0 @xl:border-l-2">
            <p className="eyebrow flex items-center gap-2">
              <Icon name="pin" accent="teal" className="size-5" />
              Local mode
            </p>
            {profile.local ? (
              <>
                <p className="mt-2 font-display text-3xl break-words uppercase">{profile.local.homeCity}</p>
                <p className="text-sm font-semibold">Hosting visitors · {profile.local.knownAreas.join(', ') || 'all over town'}</p>
              </>
            ) : (
              <p className="mt-2">At home? Set up Local mode to show visitors your favourite spots. It takes about a minute.</p>
            )}
            {confirmLocal ? (
              <div className="mt-4 border-2 border-dashed border-ink bg-sheet p-3" role="alertdialog" aria-label="Remove local profile?">
                <p className="font-semibold">Remove your local profile? Your general profile and trips stay.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="danger"
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
          </div>
        </div>
        {profile.local && (
          <details className="group mt-6 border-2 border-ink">
            <summary className="sheet-grain flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2 font-bold [&::-webkit-details-marker]:hidden">
              <Icon name="clipboard" className="size-5" />
              <span className="flex-1">Your hosting details</span>
              <span className="text-xs tracking-[0.1em] uppercase group-open:hidden">Show</span>
              <span className="hidden text-xs tracking-[0.1em] uppercase group-open:inline">Hide</span>
              <Icon name="chevron-down" accent="none" className="size-5 transition-transform group-open:rotate-180" />
            </summary>
            <SummaryList
              className="border-x-0 border-b-0"
              title={`Hosting in ${profile.local.homeCity}`}
              items={localItems(profile.local)}
              onEdit={() => navigate('/mode/local', { state: editLocal })}
            />
          </details>
        )}
      </section>

      {/* Points */}
      <section id="points" aria-labelledby="points-title" className="scroll-mt-24">
        <SectionTitle id="points-title" icon="coin">
          Points
        </SectionTitle>
        <div className="sheet-grain border-2 border-ink shadow-block-sm">
          <div className="flex items-center gap-4 border-b-2 border-ink bg-saffron p-5">
            <Icon name="coin" accent="sheet" className="size-14" />
            <div>
              <p className="font-display text-5xl leading-none">{pointsBalance(profile.rewards).toLocaleString()}</p>
              <p className="text-sm font-semibold">to spend · {pointsEarned(profile.rewards).toLocaleString()} earned in total</p>
            </div>
          </div>
          {ledger.length > 0 ? (
            <ul aria-label="Recent points activity">
              {ledger.map((e, i) => (
                <li key={e.id} className={cn('flex items-center justify-between gap-3 px-5 py-3', i > 0 && 'border-t-2 border-ink')}>
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon name={e.reason === 'purchase' ? 'bag' : 'trophy'} className="size-5" />
                    {e.reason === 'purchase' ? `Bought ${e.label}` : e.label}
                  </span>
                  <span className="font-display text-lg tabular-nums">{e.amount > 0 ? `+${e.amount}` : e.amount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4">Complete quests to earn your first points.</p>
          )}
          <div className="grid grid-cols-2 border-t-2 border-ink">
            <Link to="/quests" className={cn(arrowRowClasses, 'border-0 border-r-2')}>
              <span className={arrowLabel}>Quests</span>
              <ArrowCell />
            </Link>
            <Link to="/shop" className={cn(arrowRowClasses, 'border-0')}>
              <span className={arrowLabel}>Shop</span>
              <ArrowCell />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---- Avatar & Migo ------------------------------------------------------------------------------

function Style() {
  const { account, profile, updateAccount, setEquipped } = useStore()
  const [name, setName] = useState(account?.name ?? '')
  // Old emoji avatars show as the default picture, so one is always selected.
  const [avatar, setAvatar] = useState<string>(resolveAvatar(account?.avatar))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!account || !profile) return null

  const owned = SHOP_ITEMS.filter((i) => profile.rewards.owned.includes(i.id))
  const dirty = name.trim() !== account.name || avatar !== resolveAvatar(account.avatar)

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
    <div className="space-y-12">
      <section aria-labelledby="you-title">
        <SectionTitle id="you-title" icon="user">
          Name & avatar
        </SectionTitle>
        <Card>
          <form onSubmit={save} className="space-y-6">
            <TextField label="Name" value={name} onChange={setName} maxLength={NAME_MAX_LENGTH} autoComplete="given-name" />
            <fieldset>
              <legend className="eyebrow mb-2">Avatar</legend>
              <div className="grid grid-cols-4 border-t-2 border-l-2 border-ink sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
                {AVATAR_LIST.map((a) => (
                  <label
                    key={a.id}
                    className="relative grid cursor-pointer place-items-center border-r-2 border-b-2 border-ink p-1.5 transition-colors hover:bg-saffron-soft has-checked:bg-saffron has-focus-visible:outline-3 has-focus-visible:-outline-offset-[6px] has-focus-visible:outline-ink"
                  >
                    <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} className="peer sr-only" />
                    <img src={a.src} alt="" className="aspect-square w-full object-contain" />
                    <span className="sr-only">{a.alt}</span>
                    <span className="absolute top-1 right-1 hidden size-5 place-items-center bg-ink text-saffron peer-checked:grid" aria-hidden>
                      <Icon name="check" accent="none" strokeWidth={3.2} className="size-4" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!dirty || !name.trim() || busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <p aria-live="polite" className="font-semibold">
                {message}
              </p>
            </div>
          </form>
        </Card>
      </section>

      <section aria-labelledby="wardrobe-title">
        <SectionTitle id="wardrobe-title" icon="shop">
          Migo’s wardrobe
        </SectionTitle>
        <div className="sheet-grain grid border-2 border-ink shadow-block-sm sm:grid-cols-[auto_1fr]">
          <div className="grid place-items-center border-b-2 border-ink bg-teal-soft p-6 sm:border-r-2 sm:border-b-0">
            <Mascot pose="cheer" accessories={profile.rewards.equipped} className="h-52" label="Migo wearing your accessories" />
          </div>
          <div className="p-5">
            {owned.length === 0 ? (
              <p>Migo’s wardrobe is empty. Earn points from quests and pick something out in the shop.</p>
            ) : (
              <ul className="border-t-2 border-l-2 border-ink">
                {owned.map((item) => {
                  const wearing = profile.rewards.equipped[item.slot] === item.id
                  return (
                    <li key={item.id} className={cn('flex items-center gap-3 border-r-2 border-b-2 border-ink px-3 py-2', wearing && 'bg-saffron-soft')}>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{item.name}</span>
                        <span className="text-xs font-semibold">{SLOT_LABELS[item.slot]}</span>
                      </span>
                      <Button size="sm" variant={wearing ? 'secondary' : 'primary'} onClick={() => setEquipped(item.id, !wearing)} aria-label={`${wearing ? 'Take off' : 'Put on'} ${item.name}`}>
                        {wearing ? 'Take off' : 'Put on'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link to="/shop" className={cn(arrowRowClasses, 'mt-4 w-full')}>
              <span className={arrowLabel}>Visit the shop</span>
              <ArrowCell />
            </Link>
          </div>
        </div>
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
  const tab: Tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview'

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile) || !profile.universal) return <Navigate to="/onboarding/questions" replace />

  const cities = profile.universal.citiesDiscovered

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="sheet-grain flex items-stretch border-2 border-ink shadow-block">
        <div className="grid shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft p-3">
          <Avatar avatar={account.avatar} size="xl" className="border-0 bg-transparent" />
        </div>
        <div className="min-w-0 flex-1 p-5">
          <p className="eyebrow">Your profile</p>
          <h1 className="mt-1 truncate text-4xl sm:text-5xl">{account.name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            {profile.universal.homeCity && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="house" className="size-5" />
                {profile.universal.homeCity}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5" title={cities.map(cityLabel).join(' · ')}>
              <Icon name="globe" className="size-5" />
              {cities.length} {cities.length === 1 ? 'city' : 'cities'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="coin" className="size-5" />
              {pointsBalance(profile.rewards).toLocaleString()} points
            </span>
          </p>
        </div>
        <div className="relative hidden w-40 shrink-0 place-items-center overflow-hidden border-l-2 border-ink bg-teal-soft sm:grid">
          <Mascot pose="cheer" accessories={profile.rewards.equipped} className="h-32" />
        </div>
      </header>

      {saved && (
        <p className="flex items-center gap-2 border-2 border-ink bg-teal-soft px-4 py-2 font-semibold" role="status">
          <Icon name="check" accent="none" strokeWidth={2.6} className="size-5" />
          {saved}
        </p>
      )}

      <div>
        <nav aria-label="Profile sections" className="sheet-grain grid grid-cols-3 border-2 border-b-0 border-ink">
          {TABS.map((t, i) => (
            <Link
              key={t.id}
              to={t.id === 'overview' ? '/profile' : `/profile?tab=${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex min-h-12 min-w-0 items-center justify-center gap-2 px-2 py-1.5 text-center text-[0.7rem] leading-tight font-bold tracking-[0.08em] uppercase transition-colors sm:px-3 sm:text-sm sm:tracking-[0.1em]',
                i > 0 && 'border-l-2 border-ink',
                tab === t.id ? 'bg-saffron' : 'hover:bg-saffron-soft',
              )}
            >
              <Icon name={t.icon} accent={tab === t.id ? 'sheet' : 'saffron'} className="hidden size-5 sm:block" />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="hatch-band border-x-2 border-ink" aria-hidden />
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'answers' && (
        <section aria-labelledby="answers-title" className="space-y-5">
          <SectionTitle id="answers-title" icon="clipboard">
            You, everywhere
          </SectionTitle>
          <div className="flex items-end gap-4">
            <p className="flex-1">Your personality and general preferences. Both modes use these as defaults, and switching modes never changes them.</p>
            <Mascot pose="read" className="hidden h-24 sm:block" />
          </div>
          <UniversalSummary universal={profile.universal} onEdit={(stepId) => navigate(`/onboarding/questions?step=${stepIdOf(stepId)}`)} />
        </section>
      )}
      {tab === 'style' && <Style />}
    </div>
  )
}
