// The only data-access module screens use. Hunts, partners and the leaderboard are still mock data
// (backend.ts has the Supabase versions ready to swap in). Accounts and profiles save to Supabase
// when it's configured, and to this device otherwise. Screens must not import mockData.
import { DEFAULT_AVATAR } from './avatars'
import type { PlacePick } from '../features/places/types'
import { MESSAGE_MAX_LENGTH, type Message, type Person, type Thread } from '../features/chat/types'
import { addCity, tidyDogs } from '../features/profile/model'
import { compatibility, type Compatibility, type MatchDogs, type MatchProfile } from '../features/profile/matching'
import type {
  Account,
  DiscoveredCity,
  ExploreMode,
  LocalContext,
  ProfileRecord,
  TouristTrip,
  UniversalProfile,
} from '../features/profile/types'
import { scoreHunt } from '../features/scoring/score'
import { distanceMeters } from './geo'
import { HUNTS, TEAMS, USERS } from './mockData'
import * as db from './profileDb'
import { profileRepo } from './profileRepo'
import type { Hunt, LatLng, Role, ScoreBreakdown, Team, User } from './types'

// Small fake latency so loading states get exercised.
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(value: T): T => structuredClone(value)
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Hunts near a location. Today: the curated McGill list, nearest first when a location is given.
 * Later: generated from Google Places around `near` (same Hunt type).
 */
export async function getHunts(near?: LatLng): Promise<Hunt[]> {
  await delay()
  const hunts = clone(HUNTS)
  if (near) hunts.sort((a, b) => distanceMeters(near, a) - distanceMeters(near, b))
  return hunts
}

export async function getHunt(id: string): Promise<Hunt | null> {
  await delay(150)
  const hunt = HUNTS.find((h) => h.id === id)
  return hunt ? clone(hunt) : null
}

/** A candidate's public dog answer in the shape compatibility() expects. */
export const matchDogs = (u: Pick<User, 'dogs'>): MatchDogs | undefined =>
  u.dogs ? { stance: u.dogs.stance, goodWithDogs: u.dogs.dog?.goodWithDogs ?? null } : undefined

/** A candidate's public answers in the shape compatibility() expects. */
export const asMatchProfile = (u: User): Partial<MatchProfile> => ({
  mode: u.role,
  interests: u.interests,
  languages: u.languages,
  dogs: matchDogs(u),
  ...u.traits,
})

/**
 * Picks a partner in the opposite mode. With a profile, candidates are ranked by compatibility
 * (shared interests, languages, …) and one of the best is chosen; without one it's random.
 */
export async function findPartner(role: Role, me?: MatchProfile | null): Promise<User> {
  await delay()
  const wanted: Role = role === 'tourist' ? 'local' : 'tourist'
  const pool = USERS.filter((u) => u.role === wanted)
  // Every partner here is a sample profile until the backend's find_partner is wired in.
  const sample = (u: User): User => ({ ...clone(u), demo: true })
  if (!me) return sample(pool[Math.floor(Math.random() * pool.length)])
  const scored = pool
    .map((u) => ({ u, match: compatibility(me, asMatchProfile(u)) }))
    // Hard filter: "prefers no dogs" is never paired with a dog owner.
    .filter((s) => !s.match.blocked)
    .map((s) => ({ u: s.u, score: s.match.total ?? 0 }))
    .sort((a, b) => b.score - a.score)
  if (scored.length === 0) throw new Error('No compatible partner right now.')
  // A little variety: pick randomly among everyone within 0.1 of the best score.
  const best = scored.filter((s) => s.score >= scored[0].score - 0.1)
  return sample(best[Math.floor(Math.random() * best.length)].u)
}

// ---- Accounts & profiles ----------------------------------------------------------------------
// One account per person. Universal answers, tourist trips, local context, rewards and likes all
// hang off the account id, so switching modes never creates or duplicates anything.
// Storage: Supabase when configured, this device otherwise (see profileRepo.ts).

/** Read-modify-write one profile record. */
async function updateRecord(accountId: string, change: (record: ProfileRecord) => ProfileRecord): Promise<ProfileRecord> {
  const repo = profileRepo()
  if (!(await repo.getAccount(accountId))) throw new Error('Account not found. Please create your profile again.')
  const next = { ...change(await repo.getRecord(accountId)), accountId, updatedAt: Date.now() }
  await repo.saveRecord(next)
  return clone(next)
}

/** "supabase" or "device": where profiles are saved right now (shown in Settings). */
export const profileStorage = () => profileRepo().kind

export async function createAccount(input: { name: string; avatar: string }): Promise<{ account: Account; profile: ProfileRecord }> {
  await delay(200)
  const name = input.name.trim()
  if (!name) throw new Error('A name is required.')
  const repo = profileRepo()
  const account = await repo.createAccount({ name, avatar: input.avatar })
  const profile = await repo.getRecord(account.id)
  await repo.saveRecord(profile)
  return { account: clone(account), profile: clone(profile) }
}

export async function updateAccount(accountId: string, input: { name: string; avatar: string }): Promise<Account> {
  await delay(150)
  const repo = profileRepo()
  const existing = await repo.getAccount(accountId)
  if (!existing) throw new Error('Account not found.')
  const name = input.name.trim()
  if (!name) throw new Error('A name is required.')
  const account = { ...existing, name, avatar: input.avatar }
  await repo.saveAccount(account)
  return clone(account)
}

/** Returns null when the account no longer exists (e.g. deleted). */
export async function getProfile(accountId: string): Promise<{ account: Account; profile: ProfileRecord } | null> {
  await delay(100)
  const repo = profileRepo()
  const account = await repo.getAccount(accountId)
  if (!account) return null
  return { account: clone(account), profile: clone(await repo.getRecord(accountId)) }
}

/** The signed-in login's account and profile (Supabase login). Null = this login has no profile yet. */
export async function getMyProfile(): Promise<{ account: Account; profile: ProfileRecord } | null> {
  const found = await profileRepo().getMine()
  return found ? { account: clone(found.account), profile: clone(found.record) } : null
}

/** Saves the universal profile only. Trips, local context and rewards are untouched. */
export async function saveUniversalProfile(accountId: string, universal: UniversalProfile): Promise<ProfileRecord> {
  await delay(250)
  return updateRecord(accountId, (r) => ({
    ...r,
    // Dog details are dropped unless they have a dog, so no stale name/photo is kept.
    universal: clone(tidyDogs(universal)),
    universalCompletedAt: r.universalCompletedAt ?? Date.now(),
  }))
}

/**
 * Adds a real place (picked from city search) to the universal profile's discovered cities.
 * Duplicates are ignored; an older free-text entry with the same name is upgraded to the real place.
 * `source`/`refId` let quests and trips add cities automatically later.
 */
export async function addDiscoveredCity(
  accountId: string,
  place: PlacePick,
  source: DiscoveredCity['source'] = 'manual',
  refId?: string,
): Promise<ProfileRecord> {
  await delay(120)
  if (!place.placeId || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) throw new Error('Pick a city from the suggestions.')
  return updateRecord(accountId, (r) => {
    if (!r.universal) throw new Error('Finish your profile first.')
    return { ...r, universal: { ...r.universal, citiesDiscovered: addCity(r.universal.citiesDiscovered, place, source, refId) } }
  })
}

export async function removeDiscoveredCity(accountId: string, cityId: string): Promise<ProfileRecord> {
  await delay(120)
  return updateRecord(accountId, (r) => {
    if (!r.universal) return r
    return { ...r, universal: { ...r.universal, citiesDiscovered: r.universal.citiesDiscovered.filter((c) => c.id !== cityId) } }
  })
}

export async function setActiveMode(accountId: string, mode: ExploreMode): Promise<ProfileRecord> {
  await delay(120)
  return updateRecord(accountId, (r) => ({ ...r, activeMode: mode }))
}

/** Creates or updates a trip. `activate` also makes it the active trip and switches to Tourist mode. */
export async function saveTrip(accountId: string, trip: TouristTrip, opts: { activate?: boolean } = {}): Promise<ProfileRecord> {
  await delay(200)
  return updateRecord(accountId, (r) => {
    const saved = { ...clone(trip), destination: trip.destination.trim(), updatedAt: Date.now() }
    const exists = r.tourist.trips.some((t) => t.id === trip.id)
    const trips = exists ? r.tourist.trips.map((t) => (t.id === trip.id ? saved : t)) : [...r.tourist.trips, saved]
    return {
      ...r,
      tourist: { trips, activeTripId: opts.activate ? trip.id : (r.tourist.activeTripId ?? trip.id) },
      activeMode: opts.activate ? 'tourist' : r.activeMode,
    }
  })
}

export async function setActiveTrip(accountId: string, tripId: string): Promise<ProfileRecord> {
  await delay(120)
  return updateRecord(accountId, (r) => {
    if (!r.tourist.trips.some((t) => t.id === tripId)) throw new Error('Trip not found.')
    return { ...r, tourist: { ...r.tourist, activeTripId: tripId } }
  })
}

/** Deletes a trip. If it was active, the most recently updated remaining trip becomes active. */
export async function deleteTrip(accountId: string, tripId: string): Promise<ProfileRecord> {
  await delay(150)
  return updateRecord(accountId, (r) => {
    const trips = r.tourist.trips.filter((t) => t.id !== tripId)
    let activeTripId = r.tourist.activeTripId
    if (activeTripId === tripId) {
      activeTripId = [...trips].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null
    }
    return { ...r, tourist: { trips, activeTripId } }
  })
}

/** Saves Local mode context. `activate` also switches to Local mode. */
export async function saveLocalContext(accountId: string, local: LocalContext, opts: { activate?: boolean } = {}): Promise<ProfileRecord> {
  await delay(200)
  return updateRecord(accountId, (r) => ({
    ...r,
    local: { ...clone(local), homeCity: local.homeCity.trim(), neighbourhood: local.neighbourhood.trim(), updatedAt: Date.now() },
    activeMode: opts.activate ? 'local' : r.activeMode,
  }))
}

/** Removes Local mode context. If Local mode was active, nothing is active until the person picks again. */
export async function clearLocalContext(accountId: string): Promise<ProfileRecord> {
  await delay(150)
  return updateRecord(accountId, (r) => ({ ...r, local: null, activeMode: r.activeMode === 'local' ? null : r.activeMode }))
}

/** Permanently removes the account and every answer, point and message attached to it. */
export async function deleteAccount(accountId: string): Promise<void> {
  await delay(150)
  await profileRepo().deleteAccount(accountId)
  db.deleteAccountData(accountId)
}

// ---- Points, quests & shop -------------------------------------------------------------------
// Moved to lib/economy (the server's rpc functions when signed in, the device economy otherwise),
// used through the store: claimQuest, refreshDaily, purchase, setEquipped, recordVisit. Nothing
// here writes points, purchases or the outfit into the profile record any more; `record.rewards`
// is only read once, to carry an existing device ledger into the device economy.

// ---- People & messages ------------------------------------------------------------------------
// TODO(backend): live discovery and message delivery. Until then, discovery shows the sample
// profiles from the match pool (flagged `demo`), and messages you send are kept on this device.

/** People to discover, most compatible first, in the opposite mode to yours. */
export async function getPeopleToDiscover(me: MatchProfile | null): Promise<{ person: Person; match: Compatibility }[]> {
  await delay(200)
  const wanted: Role | null = me ? (me.mode === 'tourist' ? 'local' : 'tourist') : null
  return USERS.filter((u) => !wanted || u.role === wanted)
    .map((u) => {
      const person: Person = { id: u.id, name: u.name, avatar: u.avatar, mode: u.role, interests: u.interests ?? [], languages: u.languages ?? [], funFact: u.funFact, demo: true }
      return { person, match: compatibility(me ?? {}, asMatchProfile(u)) }
    })
    // Same hard filter as matching: "prefers no dogs" never sees dog owners (and vice versa).
    .filter(({ match }) => !match.blocked)
    .sort((a, b) => (b.match.total ?? 0) - (a.match.total ?? 0))
}

/** Shows (or withdraws) interest in someone's profile. */
export async function setLiked(accountId: string, personId: string, liked: boolean): Promise<ProfileRecord> {
  await delay(120)
  return updateRecord(accountId, (r) => {
    const likes = r.likes.filter((id) => id !== personId)
    return { ...r, likes: liked ? [...likes, personId] : likes }
  })
}

function normMessage(v: unknown): Message | null {
  if (typeof v !== 'object' || v === null) return null
  const m = v as Partial<Message>
  if (typeof m.id !== 'string' || typeof m.text !== 'string' || typeof m.at !== 'number') return null
  return { id: m.id, from: m.from === 'them' ? 'them' : 'me', text: m.text, at: m.at, read: m.read !== false }
}

function normThread(v: unknown): Thread | null {
  if (typeof v !== 'object' || v === null) return null
  const t = v as Partial<Thread>
  const p = t.person as Partial<Person> | undefined
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return null
  return {
    person: {
      id: p.id,
      name: p.name,
      avatar: typeof p.avatar === 'string' ? p.avatar : DEFAULT_AVATAR,
      mode: p.mode === 'local' ? 'local' : 'tourist',
      interests: Array.isArray(p.interests) ? p.interests : [],
      languages: Array.isArray(p.languages) ? p.languages : [],
      funFact: p.funFact,
      demo: p.demo,
    },
    messages: (Array.isArray(t.messages) ? t.messages : []).map(normMessage).filter((m): m is Message => m !== null),
  }
}

/** Message threads by person id. */
export async function getThreads(accountId: string): Promise<Record<string, Thread>> {
  await delay(80)
  const out: Record<string, Thread> = {}
  for (const v of Object.values(db.getThreads(accountId))) {
    const t = normThread(v)
    if (t) out[t.person.id] = t
  }
  return out
}

export async function sendMessage(accountId: string, person: Person, text: string): Promise<Thread> {
  await delay(120)
  const clean = text.trim().slice(0, MESSAGE_MAX_LENGTH)
  if (!clean) throw new Error('Write something first.')
  const existing = (await getThreads(accountId))[person.id]
  const thread: Thread = {
    person: clone(person),
    messages: [...(existing?.messages ?? []), { id: newId('msg'), from: 'me', text: clean, at: Date.now(), read: true }],
  }
  db.putThread(accountId, person.id, thread)
  return thread
}

export async function markThreadRead(accountId: string, personId: string): Promise<Thread | null> {
  const thread = (await getThreads(accountId))[personId]
  if (!thread) return null
  const next = { ...thread, messages: thread.messages.map((m) => ({ ...m, read: true })) }
  db.putThread(accountId, personId, next)
  return next
}

export type SelfieSubmission = {
  huntId: string
  teamId: string
  /** Object URL or data URL of the selfie. Not uploaded anywhere yet. */
  imageUrl: string
  secondsLeft: number
}

/** Records a selfie and returns the points earned. */
export async function submitSelfie(submission: SelfieSubmission): Promise<ScoreBreakdown> {
  await delay(400)
  const hunt = HUNTS.find((h) => h.id === submission.huntId)
  if (!hunt) throw new Error(`Unknown hunt: ${submission.huntId}`)
  return scoreHunt(hunt, submission.secondsLeft)
}

/** Seeded teams plus the player's own team (if any), highest points first. */
export async function getLeaderboard(myTeam?: Team | null): Promise<Team[]> {
  await delay()
  const teams = clone(TEAMS)
  if (myTeam) teams.push(clone(myTeam))
  return teams.sort((a, b) => b.points - a.points)
}
