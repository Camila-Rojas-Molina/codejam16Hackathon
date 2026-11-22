// The only data-access module screens use. Hunts, partners and the leaderboard are still mock data
// (backend.ts has the Supabase versions ready to swap in). Accounts and profiles save to Supabase
// when it's configured, and to this device otherwise. Screens must not import mockData.
import { DEFAULT_AVATAR } from './avatars'
import type { PlacePick } from '../features/places/types'
import { MESSAGE_MAX_LENGTH, type Connection, type Delivery, type DiscoverEntry, type Message, type Person, type Thread } from '../features/chat/types'
import { addCity, tidyDogs } from '../features/profile/model'
import { compatibility, toMatchProfile, type Compatibility, type MatchDogs, type MatchProfile } from '../features/profile/matching'
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
import * as backend from './backend'
import * as conn from './connectionsDb'
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
  // A brand-new account gets the guided tour on its first visit to the hub.
  const profile: ProfileRecord = { ...(await repo.getRecord(account.id)), tutorial: { status: 'pending', at: Date.now() } }
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
  // Device connections go too (on Supabase the database cascades its own).
  conn.deleteAccountRows(accountId)
}

// ---- Points, quests & shop -------------------------------------------------------------------
// Moved to lib/economy (the server's rpc functions when signed in, the device economy otherwise),
// used through the store: claimQuest, refreshDaily, purchase, setEquipped, recordVisit. Nothing
// here writes points, purchases or the outfit into the profile record any more; `record.rewards`
// is only read once, to carry an existing device ledger into the device economy.

// ---- People, matches & messages --------------------------------------------------------------
// Discover ranks locals for a tourist (their top matches first); the tourist picks one and it's a
// match straight away. The local is assigned: they get "You've been matched!" and pick Say hi or
// Not now. Real people: Supabase (013_connections.sql, the server enforces every rule) when
// configured, else every account on this device (connectionsDb.ts, same rules). MIGO's sample
// profiles (mockData) live on the device in both cases: sample locals can be picked like anyone, and
// a local with nobody yet is assigned a sample tourist, so both sides can be tried alone.
// Messages to real people go through Supabase (015_messages.sql) when it's configured; messages to
// samples, and every message without a backend, stay on this device.

const SAMPLE_IDS = new Set(USERS.map((u) => u.id))
/** True for MIGO's built-in sample profiles (they can't answer requests or reply). */
export const isSamplePerson = (id: string) => SAMPLE_IDS.has(id)

const samplePerson = (u: User): Person => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  mode: u.role,
  interests: u.interests ?? [],
  languages: u.languages ?? [],
  funFact: u.funFact,
  demo: true,
  traits: {
    energy: u.traits?.energy ?? undefined,
    planning: u.traits?.planning ?? undefined,
    decisions: u.traits?.decisions ?? undefined,
    pace: u.traits?.pace ?? undefined,
    groupSize: u.traits?.groupSize ?? undefined,
    dogStance: u.dogs?.stance && u.dogs.stance !== 'no-dogs' ? u.dogs.stance : undefined,
  },
})

/** Someone's public card from their account and record (device accounts; same fields as migo_public_person). */
function personFromRecord(account: Account, record: ProfileRecord): Person {
  const u = record.universal
  const stance = u?.dogs?.stance
  return {
    id: account.id,
    name: account.name,
    avatar: account.avatar,
    mode: record.activeMode ?? 'tourist',
    interests: u?.interests ?? [],
    languages: u?.languages.spoken ?? [],
    traits: u
      ? {
          energy: u.personality.energy ?? undefined,
          planning: u.personality.planning ?? undefined,
          decisions: u.personality.decisions ?? undefined,
          pace: u.exploration.pace ?? undefined,
          groupSize: u.exploration.groupSize ?? undefined,
          dogStance: stance && stance !== 'no-dogs' ? stance : undefined,
        }
      : undefined,
  }
}

/** The fresh public card of a device account, or null for anyone else. */
function deviceCard(id: string): Person | null {
  const account = db.getAccount(id)
  return account ? personFromRecord(account, db.getRecord(id)) : null
}

/** A person's public answers in the shape compatibility() expects. */
export const personMatchProfile = (p: Person): Partial<MatchProfile> => ({
  mode: p.mode,
  interests: p.interests,
  languages: p.languages,
  energy: p.traits?.energy,
  planning: p.traits?.planning,
  decisions: p.traits?.decisions,
  pace: p.traits?.pace,
  groupSize: p.traits?.groupSize,
  dogs: p.traits?.dogStance ? { stance: p.traits.dogStance } : undefined,
})

const onSupabase = () => profileRepo().kind === 'supabase'
// Device rows have "conn-…" ids; server rows are uuids.
const isDeviceConnection = (id: string) => id.startsWith('conn-')

async function myCard(accountId: string): Promise<{ person: Person; record: ProfileRecord }> {
  const repo = profileRepo()
  const account = await repo.getAccount(accountId)
  if (!account) throw new Error('Account not found. Please log in again.')
  const record = await repo.getRecord(accountId)
  return { person: personFromRecord(account, record), record }
}

/**
 * Local mode, nobody yet: MIGO assigns the most compatible sample tourist this local hasn't met, so
 * "You've been matched!" can be tried without a second phone. Each sample is assigned at most once
 * (a Not now or a removal is final for that sample), and never while the local has a live match.
 */
async function assignSampleTourist(accountId: string, server: Connection[]): Promise<void> {
  const { person: me, record } = await myCard(accountId)
  if (record.activeMode !== 'local' || !record.universalCompletedAt) return
  const rows = conn.forAccount(accountId)
  if (rows.some((r) => r.recipientId === accountId && (r.status === 'accepted' || r.status === 'pending'))) return
  if (server.some((c) => c.direction === 'incoming' && (c.status === 'accepted' || c.status === 'pending'))) return
  const metBefore = new Set(rows.flatMap((r) => [r.requesterId, r.recipientId]))
  const mine = toMatchProfile(record)
  const best = USERS.filter((u) => u.role === 'tourist' && !metBefore.has(u.id))
    .map((u) => ({ u, match: mine ? compatibility(mine, asMatchProfile(u)) : null }))
    .filter(({ match }) => !match?.blocked)
    .sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0))[0]
  if (best) conn.assignSample(samplePerson(best.u), me)
}

/** Every match you're part of (both ways, live and closed), newest first. */
export async function getConnections(accountId: string): Promise<Connection[]> {
  // Same here: without 013 on the server, device and sample matches keep working.
  const server = onSupabase() ? await backend.myConnections().catch(() => []) : []
  await assignSampleTourist(accountId, server).catch(() => {})
  const device = conn.forAccount(accountId).map((r) => conn.asConnection(r, accountId, deviceCard))
  return [...server, ...device].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Locals a tourist can ask to connect with, most compatible first. Empty unless you're in Tourist mode.
 * Leaves out people you're connected with or who've asked you (they're in Messages), anyone who said
 * "not now" to you recently, `exclude` (people already in your Messages, e.g. hunt teammates), and
 * dog mismatches. People you've already asked are kept, marked pending.
 */
export async function discoverLocals(
  accountId: string,
  me: MatchProfile | null,
  exclude: ReadonlySet<string> = new Set(),
): Promise<(DiscoverEntry & { match: Compatibility })[]> {
  await delay(150)
  if (me?.mode !== 'tourist') return []

  const people: DiscoverEntry[] = []
  if (onSupabase()) {
    // If the server can't list people (e.g. 013_connections.sql not run yet), still show the samples.
    const server = await backend.discoverLocals().catch((err: unknown) => {
      console.warn('[discover] server list unavailable', err)
      return []
    })
    for (const p of server) people.push({ person: { ...p, demo: false }, pending: p.pending })
  } else {
    for (const account of db.listAccounts()) {
      if (account.id === accountId) continue
      const record = db.getRecord(account.id)
      if (record.activeMode !== 'local' || !record.universalCompletedAt) continue
      // The private half of the dog filter (a "no dogs" local never sees dog owners and vice versa).
      const theirs = record.universal?.dogs?.stance
      const mine = me.dogs?.stance
      if ((mine === 'no-dogs' && theirs === 'has-dog') || (mine === 'has-dog' && theirs === 'no-dogs')) continue
      people.push({ person: personFromRecord(account, record), pending: false })
    }
  }
  for (const u of USERS) if (u.role === 'local') people.push({ person: samplePerson(u), pending: false })

  // Device-side rules (the server already applied them to its own people).
  const rows = conn.forAccount(accountId)
  return people
    .filter(({ person }) => !exclude.has(person.id))
    .filter(({ person }) => {
      const pair = rows.filter((r) => r.requesterId === person.id || r.recipientId === person.id)
      if (pair.some((r) => r.status === 'accepted' || (r.status === 'pending' && r.requesterId === person.id))) return false
      return !conn.declinedRecently(accountId, person.id)
    })
    .map(({ person, pending }) => ({
      person,
      pending: pending || rows.some((r) => r.status === 'pending' && r.requesterId === accountId && r.recipientId === person.id),
      // Samples rank on their full mock answers (as hunt matching does); real people on public answers only.
      match: compatibility(me, isSamplePerson(person.id) ? asMatchProfile(USERS.find((u) => u.id === person.id)!) : personMatchProfile(person)),
    }))
    .filter(({ match }) => !match.blocked)
    .sort((a, b) => (b.match.total ?? 0) - (a.match.total ?? 0))
}

/** A tourist picks a local: it's a match. Returns the match (or the existing one: never a duplicate). */
export async function requestConnection(accountId: string, person: Person): Promise<Connection> {
  await delay(150)
  if (isSamplePerson(person.id)) {
    const { person: me, record } = await myCard(accountId)
    if (record.activeMode !== 'tourist') throw new Error('Switch to Tourist mode to match with locals.')
    return conn.asConnection(conn.request(me, person), accountId)
  }
  if (onSupabase()) return backend.requestConnection(person.id)

  const { person: me, record } = await myCard(accountId)
  const existing = conn.livePair(accountId, person.id)
  if (!existing) {
    if (record.activeMode !== 'tourist') throw new Error('Switch to Tourist mode to match with locals.')
    const theirs = db.getAccount(person.id) ? db.getRecord(person.id) : null
    if (!theirs) throw new Error('That person isn’t on MIGO any more.')
    if (theirs.activeMode !== 'local') throw new Error('They’re not in Local mode right now.')
    if (conn.declinedRecently(accountId, person.id)) throw new Error('They can’t meet up right now. Try another of your top matches.')
  }
  return conn.asConnection(conn.request(me, deviceCard(person.id) ?? person), accountId, deviceCard)
}

/** The local's answer to "You've been matched!": true = Say hi, false = Not now. Settled matches come back unchanged. */
export async function respondToConnection(accountId: string, connectionId: string, accept: boolean): Promise<Connection> {
  await delay(120)
  if (!isDeviceConnection(connectionId)) return backend.respondConnection(connectionId, accept)
  const row = conn.respond(accountId, connectionId, accept)
  if (!row) throw new Error('That match isn’t there any more.')
  return conn.asConnection(row, accountId, deviceCard)
}

/** The tourist withdraws a request that hasn't been answered. */
export async function cancelConnection(accountId: string, connectionId: string): Promise<Connection> {
  await delay(120)
  if (!isDeviceConnection(connectionId)) return backend.cancelConnection(connectionId)
  const row = conn.cancel(accountId, connectionId)
  if (!row) throw new Error('That request isn’t there any more.')
  return conn.asConnection(row, accountId, deviceCard)
}

export async function markConnectionsSeen(accountId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const device = ids.filter(isDeviceConnection)
  const server = ids.filter((id) => !isDeviceConnection(id))
  if (device.length) conn.markSeen(accountId, device)
  if (server.length && onSupabase()) await backend.markConnectionsSeen(server)
}

/**
 * Removes someone from your Messages: ends the connection (if there is one) and hides the
 * conversation. Messages are kept, so connecting again later reopens the same conversation.
 */
export async function removeFromMessages(accountId: string, personId: string, connectionId?: string | null): Promise<ProfileRecord> {
  await delay(120)
  if (connectionId) {
    if (isDeviceConnection(connectionId)) conn.remove(accountId, connectionId)
    else await backend.removeConnection(connectionId)
  }
  return updateRecord(accountId, (r) => ({ ...r, removedChats: { ...r.removedChats, [personId]: Date.now() } }))
}

/** Records the guided tour as completed or skipped, or queues it to show again. */
export async function setTutorialStatus(accountId: string, status: 'pending' | 'completed' | 'skipped'): Promise<ProfileRecord> {
  return updateRecord(accountId, (r) => ({ ...r, tutorial: { status, at: Date.now() } }))
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

// Supabase is configured but 015_messages.sql hasn't been run yet: messages stay on this device, as
// they did before, instead of failing.
let serverMessagesMissing = false
const isMissingFunction = (err: unknown) => err instanceof backend.BackendError && (err.code === 'PGRST202' || err.status === 404)

/** Where messages to this person go: the server (they get them) or this device. */
export const messageDelivery = (personId: string): Delivery =>
  onSupabase() && !serverMessagesMissing && !isSamplePerson(personId) ? 'server' : 'device'

export type MessageSync = Awaited<ReturnType<typeof backend.messageChanges>>

/** Server messages sent or read after `since` (null = the most recent). Null when messages aren't on the server. */
export async function syncMessages(since: string | null): Promise<MessageSync | null> {
  if (!onSupabase() || serverMessagesMissing) return null
  try {
    return await backend.messageChanges(since)
  } catch (err) {
    if (!isMissingFunction(err)) throw err
    serverMessagesMissing = true
    return null
  }
}

export type SentMessage = { delivery: 'server'; message: backend.ServerMessage } | { delivery: 'device'; thread: Thread }

export async function sendMessage(accountId: string, person: Person, text: string): Promise<SentMessage> {
  const clean = text.trim().slice(0, MESSAGE_MAX_LENGTH)
  if (!clean) throw new Error('Write something first.')
  if (messageDelivery(person.id) === 'server') {
    try {
      return { delivery: 'server', message: await backend.sendChatMessage(person.id, clean) }
    } catch (err) {
      if (!isMissingFunction(err)) throw err
      serverMessagesMissing = true
    }
  }
  await delay(120)
  const existing = (await getThreads(accountId))[person.id]
  const thread: Thread = {
    person: clone(person),
    messages: [...(existing?.messages ?? []), { id: newId('msg'), from: 'me', text: clean, at: Date.now(), read: true }],
  }
  db.putThread(accountId, person.id, thread)
  return { delivery: 'device', thread }
}

/** Marks everything this person sent you on the server as read (every device sees it). */
export async function markServerMessagesRead(personId: string): Promise<void> {
  if (messageDelivery(personId) === 'server') await backend.markMessagesRead(personId)
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
