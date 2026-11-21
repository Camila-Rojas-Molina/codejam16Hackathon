// The only data-access module. Returns mock data now; swap the bodies for Supabase /
// Google Places later without changing the signatures. Screens must not import mockData.
import { compatibility, type MatchProfile } from '../features/profile/matching'
import type {
  Account,
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
import type { Hunt, LatLng, Role, ScoreBreakdown, Team, User } from './types'

// Small fake latency so loading states get exercised.
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(value: T): T => structuredClone(value)

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

/**
 * Picks a partner in the opposite mode. With a profile, candidates are ranked by compatibility
 * (shared interests, languages, …) and one of the best is chosen; without one it's random.
 */
export async function findPartner(role: Role, me?: MatchProfile | null): Promise<User> {
  await delay()
  const wanted: Role = role === 'tourist' ? 'local' : 'tourist'
  const pool = USERS.filter((u) => u.role === wanted)
  if (!me) return clone(pool[Math.floor(Math.random() * pool.length)])
  const scored = pool
    .map((u) => ({ u, score: compatibility(me, { interests: u.interests, languages: u.languages }).total ?? 0 }))
    .sort((a, b) => b.score - a.score)
  // A little variety: pick randomly among everyone within 0.1 of the best score.
  const best = scored.filter((s) => s.score >= scored[0].score - 0.1)
  return clone(best[Math.floor(Math.random() * best.length)].u)
}

// ---- Accounts & profiles ----------------------------------------------------------------------
// One account per person. Universal answers, tourist trips and local context all hang off the
// account id, so switching modes never creates or duplicates anything.

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function requireAccount(accountId: string) {
  if (!db.getAccount(accountId)) throw new Error('Account not found. Please create your profile again.')
}

/** Read-modify-write one profile record. */
function updateRecord(accountId: string, change: (record: ProfileRecord) => ProfileRecord): ProfileRecord {
  requireAccount(accountId)
  const next = { ...change(db.getRecord(accountId)), accountId, updatedAt: Date.now() }
  db.putRecord(next)
  return clone(next)
}

export async function createAccount(input: { name: string; avatar: string }): Promise<{ account: Account; profile: ProfileRecord }> {
  await delay(200)
  const name = input.name.trim()
  if (!name) throw new Error('A name is required.')
  const account: Account = { id: newId('acct'), name, avatar: input.avatar, createdAt: Date.now() }
  db.putAccount(account)
  const profile = db.getRecord(account.id)
  db.putRecord(profile)
  return { account: clone(account), profile: clone(profile) }
}

export async function updateAccount(accountId: string, input: { name: string; avatar: string }): Promise<Account> {
  await delay(150)
  const existing = db.getAccount(accountId)
  if (!existing) throw new Error('Account not found.')
  const name = input.name.trim()
  if (!name) throw new Error('A name is required.')
  const account = { ...existing, name, avatar: input.avatar }
  db.putAccount(account)
  return clone(account)
}

/** Returns null when the account no longer exists (e.g. deleted on this device). */
export async function getProfile(accountId: string): Promise<{ account: Account; profile: ProfileRecord } | null> {
  await delay(100)
  const account = db.getAccount(accountId)
  if (!account) return null
  return { account: clone(account), profile: clone(db.getRecord(accountId)) }
}

/** Saves the universal profile only. Trips and local context are untouched. */
export async function saveUniversalProfile(accountId: string, universal: UniversalProfile): Promise<ProfileRecord> {
  await delay(250)
  return updateRecord(accountId, (r) => ({
    ...r,
    universal: clone(universal),
    universalCompletedAt: r.universalCompletedAt ?? Date.now(),
  }))
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

/** Permanently removes the account and every answer attached to it. */
export async function deleteAccount(accountId: string): Promise<void> {
  await delay(150)
  db.deleteAccountData(accountId)
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
