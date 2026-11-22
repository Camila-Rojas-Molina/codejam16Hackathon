// Client for the Supabase backend (backend/supabase/migrations). Uses plain fetch, so no
// extra npm package is needed. Not wired into the screens yet: api.ts still returns mock
// data. To switch, call these from api.ts when isBackendConfigured() is true. Requests carry the
// signed-in login's token (auth.ts) when there is one.
import type { Account, ProfileRecord } from '../features/profile/types'
import { getAccessToken } from './auth'
import { config } from './config'
import type { Difficulty, Hunt, LatLng, Role, ScoreBreakdown, Team, User } from './types'

export function isBackendConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey)
}

// ---- Shapes returned by the database -----------------------------------------

type HuntRow = {
  id: string
  title: string
  photo: string
  lat: number
  lng: number
  time_limit_sec: number
  base_points: number
  difficulty: Difficulty
  reveal_text: string
  kind: 'landmark' | 'mystery' | 'dog-park' | 'accessibility'
  accessible_for: string[]
}

type ProfileRow = {
  id: string
  name: string
  avatar: string
  role: Role
  fun_fact: string | null
}

type TeamRow = {
  id: string
  name: string
  points: number
  completed_hunt_ids: string[]
  members: User[] | null
}

/** Points from the server. firstFinderBonus is extra: 100 / 50 / 25 for the first three teams. */
export type BackendScore = ScoreBreakdown & {
  firstFinderBonus: number
  findRank: number
  alreadySubmitted: boolean
}

/** Thrown when the server says the team isn't close enough to the spot yet. */
export class TooFarError extends Error {}

/** Any other server error. code is the Postgres errcode when there is one (e.g. '42501', '23505'). */
export class BackendError extends Error {
  readonly code: string | null
  readonly status: number
  constructor(message: string, code: string | null, status: number) {
    super(message)
    this.name = 'BackendError'
    this.code = code
    this.status = status
  }
}

// ---- HTTP helpers --------------------------------------------------------------

// apikey is always the anon key; Authorization carries the signed-in login's token when there is
// one (so the database knows who is calling), else the anon key.
async function headers(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = (await getAccessToken()) ?? config.supabaseAnonKey
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    ...extra,
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isBackendConfigured()) throw new Error('Backend not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  const res = await fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers: { ...(await headers({ 'Content-Type': 'application/json' })), ...(init.headers as Record<string, string>) },
  })
  const text = await res.text()
  let body: { hint?: string; message?: string; code?: string } | null = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    if (body?.hint === 'too_far') throw new TooFarError(body.message ?? 'Not at the spot yet')
    // 42501 "Not your account", 23505 "This login already has a profile", etc.: show the server's message.
    throw new BackendError(body?.message ?? `Request failed (${res.status})`, body?.code ?? null, res.status)
  }
  return body as T
}

const rpc = <T>(fn: string, args: Record<string, unknown>) =>
  request<T>(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })

// ---- Mapping -------------------------------------------------------------------

const toHunt = (row: HuntRow): Hunt => ({
  id: row.id,
  title: row.title,
  photo: row.photo,
  lat: row.lat,
  lng: row.lng,
  timeLimitSec: row.time_limit_sec,
  basePoints: row.base_points,
  difficulty: row.difficulty,
  revealText: row.reveal_text,
})

const toUser = (row: ProfileRow): User => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar,
  role: row.role,
  funFact: row.fun_fact ?? undefined,
})

const toTeam = (row: TeamRow): Team => {
  const members = row.members ?? []
  return {
    id: row.id,
    name: row.name,
    members: [members[0], members[1]] as [User, User],
    points: row.points,
    completedHuntIds: row.completed_hunt_ids ?? [],
  }
}

// ---- API -----------------------------------------------------------------------

export type NewProfile = {
  name: string
  avatar: string
  role: Role
  funFact?: string
  hasDog?: boolean
  /** 'mobility' | 'visual' | 'hearing' | 'cognitive' */
  accessibilityNeeds?: string[]
}

/** Onboarding. Save the returned user's id in localStorage: it identifies the player. */
export async function createProfile(p: NewProfile): Promise<User> {
  const row = await rpc<ProfileRow>('create_profile', {
    p_name: p.name,
    p_avatar: p.avatar,
    p_role: p.role,
    p_fun_fact: p.funFact ?? null,
    p_has_dog: p.hasDog ?? false,
    p_accessibility_needs: p.accessibilityNeeds ?? [],
  })
  return toUser(row)
}

/**
 * Matches the player with someone of the opposite role. Polls until a partner is found
 * or the timeout passes, then returns null (the screen can fall back to a mock partner).
 */
export async function findTeam(profileId: string, timeoutMs = 20_000, everyMs = 2_000): Promise<Team | null> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const row = await rpc<TeamRow | null>('find_partner', { p_profile_id: profileId })
    if (row) return toTeam(row)
    if (Date.now() + everyMs > deadline) return null
    await new Promise((resolve) => setTimeout(resolve, everyMs))
  }
}

/** Hunts for this player: dog park hunts only for dog owners, accessible places first, then nearest. */
export async function getHunts(profileId?: string | null, near?: LatLng): Promise<Hunt[]> {
  const rows = await rpc<HuntRow[]>('get_hunts', {
    p_profile_id: profileId ?? null,
    p_lat: near?.lat ?? null,
    p_lng: near?.lng ?? null,
  })
  return rows.map(toHunt)
}

export async function getHunt(id: string): Promise<Hunt | null> {
  const rows = await request<HuntRow[]>(`/rest/v1/hunts?id=eq.${encodeURIComponent(id)}&select=*`)
  return rows[0] ? toHunt(rows[0]) : null
}

/** Uploads a selfie to the 'selfies' bucket. Returns the storage path to pass to submitSelfie. */
export async function uploadSelfie(teamId: string, huntId: string, image: Blob): Promise<string> {
  const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${teamId}/${huntId}-${Date.now()}.${ext}`
  const res = await fetch(`${config.supabaseUrl}/storage/v1/object/selfies/${path}`, {
    method: 'POST',
    headers: await headers({ 'Content-Type': image.type || 'image/jpeg', 'x-upsert': 'true' }),
    body: image,
  })
  if (!res.ok) throw new Error(`Selfie upload failed (${res.status})`)
  return path
}

export function selfieUrl(path: string) {
  return `${config.supabaseUrl}/storage/v1/object/public/selfies/${path}`
}

export type BackendSubmission = {
  teamId: string
  huntId: string
  secondsLeft: number
  /** Where the player is now. The server checks it's within 75 m of the spot. */
  position?: LatLng | null
  selfiePath?: string | null
  /** Skips the GPS check (the "Simulate arrival" button). */
  demo?: boolean
}

/** Checks location and scores the hunt on the server. Throws TooFarError if not at the spot. */
export async function submitSelfie(s: BackendSubmission): Promise<BackendScore> {
  return rpc<BackendScore>('submit_selfie', {
    p_team_id: s.teamId,
    p_hunt_id: s.huntId,
    p_seconds_left: Math.round(s.secondsLeft),
    p_lat: s.position?.lat ?? null,
    p_lng: s.position?.lng ?? null,
    p_selfie_path: s.selfiePath ?? null,
    p_demo: s.demo ?? false,
  })
}

/** All teams, highest points first. */
export async function getLeaderboard(): Promise<Team[]> {
  const rows = await request<TeamRow[]>('/rest/v1/leaderboard?select=*&order=points.desc')
  return rows.map(toTeam)
}

// ---- MIGO accounts & profiles (004_migo_profiles.sql) ----------------------------
// One profile row per person (no permanent role); the universal profile, trips, local context,
// rewards and likes live in one JSON record next to it. profiles.role mirrors the active mode
// so find_partner() keeps working.

type MigoAccountRow = { id: string; name: string; avatar: string; created_at: string }

const toAccount = (row: MigoAccountRow): Account => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar,
  createdAt: Date.parse(row.created_at) || Date.now(),
})

export async function createMigoAccount(input: { name: string; avatar: string }): Promise<Account> {
  return toAccount(await rpc<MigoAccountRow>('migo_create_account', { p_name: input.name, p_avatar: input.avatar }))
}

/** The account and its stored record (null record = nothing saved yet). Null if the account is gone. */
export async function getMigoProfile(id: string): Promise<{ account: Account; record: unknown } | null> {
  const row = await rpc<{ account: MigoAccountRow; record: unknown } | null>('migo_get_profile', { p_profile_id: id })
  return row ? { account: toAccount(row.account), record: row.record } : null
}

/** The signed-in login's account and record, or null when this login has no profile yet. */
export async function getMyMigoProfile(): Promise<{ account: Account; record: unknown } | null> {
  const row = await rpc<{ account: MigoAccountRow; record: unknown } | null>('migo_my_profile', {})
  return row?.account ? { account: toAccount(row.account), record: row.record } : null
}

export async function updateMigoAccount(account: Account): Promise<void> {
  await rpc('migo_update_account', { p_profile_id: account.id, p_name: account.name, p_avatar: account.avatar })
}

export async function saveMigoRecord(record: ProfileRecord): Promise<void> {
  await rpc('migo_save_record', { p_profile_id: record.accountId, p_record: record })
}

export async function deleteMigoAccount(id: string): Promise<void> {
  await rpc('migo_delete_account', { p_profile_id: id })
}
