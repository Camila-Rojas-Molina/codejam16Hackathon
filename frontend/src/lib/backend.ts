// Client for the Supabase backend (backend/supabase/migrations). Uses plain fetch, so no
// extra npm package is needed. Not wired into the screens yet: api.ts still returns mock
// data. To switch, call these from api.ts when isBackendConfigured() is true. Requests carry the
// signed-in login's token (auth.ts) when there is one.
import { prepareImage } from '../features/gallery/image'
import type { Photo, PhotoMeta } from '../features/gallery/types'
import type { Account, ProfileRecord } from '../features/profile/types'
import { getAccessToken, getSession } from './auth'
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
  /** The server's hint, e.g. the retry reason from explore_register_capture ('capture_gap'…). */
  readonly hint: string | null
  constructor(message: string, code: string | null, status: number, hint: string | null = null) {
    super(message)
    this.name = 'BackendError'
    this.code = code
    this.status = status
    this.hint = hint
  }
}

// ---- HTTP helpers --------------------------------------------------------------

// apikey is always the anon key; Authorization carries the signed-in login's token when there is
// one (so the database knows who is calling), else the anon key.
export async function headers(extra?: Record<string, string>): Promise<Record<string, string>> {
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
    throw new BackendError(body?.message ?? `Request failed (${res.status})`, body?.code ?? null, res.status, body?.hint ?? null)
  }
  return body as T
}

export const rpc = <T>(fn: string, args: Record<string, unknown>) =>
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

/**
 * Deletes the account. First removes the login's files from the private 'gallery' bucket (best
 * effort: the database can't delete storage objects itself), then the profile and its rows.
 */
export async function deleteMigoAccount(id: string): Promise<void> {
  await deleteMyGalleryFiles().catch(() => undefined)
  await rpc('migo_delete_account', { p_profile_id: id })
}

// ---- Gallery (006_gallery.sql, 007_landmarks_geofencing.sql) -------------------------
// Photos live in the private 'gallery' bucket under the login's own folder (<auth uid>/<random>.jpg)
// and are shown through short-lived signed URLs. A private `photos` row holds the city, caption,
// date and, for camera captures, the landmark the server matched. Needs a signed-in login.

type PhotoRow = {
  id: string
  storage_path: string
  city_name: string | null
  country: string | null
  country_code: string | null
  lat: number | null
  lng: number | null
  place_id: string | null
  caption: string | null
  quest_id: string | null
  hunt_id: string | null
  taken_at: string
  width: number | null
  height: number | null
  created_at: string
  landmark_id?: string | null
  landmark_name?: string | null
  landmark_slug?: string | null
  association_status?: Photo['associationStatus']
  gps_accuracy_m?: number | null
  file_size_bytes?: number | null
}

/** How long a signed gallery URL stays valid. The gallery re-signs well before it runs out. */
export const SIGNED_URL_TTL_S = 3600
const SIGN_BATCH = 200

export type SignedUrls = { urls: Map<string, string>; expiresAt: number }

/** Signed URLs for files in the private 'gallery' bucket, in batches. Paths that fail are left out. */
export async function signGalleryPaths(paths: string[], expiresIn = SIGNED_URL_TTL_S): Promise<SignedUrls> {
  const urls = new Map<string, string>()
  // Count the lifetime from before the request, so it never looks longer than it is.
  const expiresAt = Date.now() + expiresIn * 1000
  const unique = [...new Set(paths)]
  for (let i = 0; i < unique.length; i += SIGN_BATCH) {
    const rows = await request<{ path: string | null; signedURL: string | null; error: string | null }[]>('/storage/v1/object/sign/gallery', {
      method: 'POST',
      body: JSON.stringify({ expiresIn, paths: unique.slice(i, i + SIGN_BATCH) }),
    })
    for (const r of rows ?? []) {
      if (r.path && r.signedURL && !r.error) urls.set(r.path, `${config.supabaseUrl}/storage/v1${r.signedURL}`)
    }
  }
  return { urls, expiresAt }
}

/** The same photos with fresh signed URLs (e.g. before the old ones expire). */
export async function resignPhotos(photos: Photo[]): Promise<Photo[]> {
  if (photos.length === 0) return photos
  const { urls, expiresAt } = await signGalleryPaths(photos.map((p) => p.storagePath))
  return photos.map((p) => ({ ...p, url: urls.get(p.storagePath) ?? null, urlExpiresAt: expiresAt }))
}

const toPhoto = (row: PhotoRow, signed: SignedUrls): Photo => ({
  id: row.id,
  storagePath: row.storage_path,
  url: signed.urls.get(row.storage_path) ?? null,
  urlExpiresAt: signed.expiresAt,
  city: row.city_name
    ? { name: row.city_name, country: row.country, countryCode: row.country_code, placeId: row.place_id }
    : null,
  lat: row.lat,
  lng: row.lng,
  caption: row.caption,
  questId: row.quest_id,
  huntId: row.hunt_id,
  takenAt: Date.parse(row.taken_at) || Date.parse(row.created_at) || 0,
  width: row.width,
  height: row.height,
  createdAt: Date.parse(row.created_at) || 0,
  landmark: row.landmark_id ? { id: row.landmark_id, name: row.landmark_name ?? 'A MIGO place', slug: row.landmark_slug ?? null } : null,
  associationStatus: row.association_status ?? null,
  gpsAccuracyM: row.gps_accuracy_m ?? null,
  fileSizeBytes: row.file_size_bytes ?? null,
})

const randomName = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

const objectPath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

/**
 * Uploads a ready-to-store JPEG to the login's folder in the 'gallery' bucket and returns its path.
 * Nothing references it yet: the caller registers it, and deletes it (deleteGalleryFile) if that fails.
 */
export async function uploadGalleryImage(image: Blob): Promise<string> {
  if (!isBackendConfigured()) throw new Error('Backend not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  const uid = getSession()?.user.id
  if (!uid) throw new BackendError('Sign in to save photos', '42501', 401)
  const path = `${uid}/${randomName()}.jpg`
  const res = await fetch(`${config.supabaseUrl}/storage/v1/object/gallery/${objectPath(path)}`, {
    method: 'POST',
    headers: await headers({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=31536000' }),
    body: image,
  })
  if (!res.ok) {
    let message = `Photo upload failed (${res.status})`
    try {
      const body = (await res.json()) as { message?: string; error?: string }
      if (body.message || body.error) message = `Photo upload failed: ${body.message ?? body.error}`
    } catch {
      // Keep the generic message.
    }
    throw new BackendError(message, null, res.status)
  }
  return path
}

/** Removes one file from the login's 'gallery' folder. Throws when the server refuses. */
export async function deleteGalleryFile(path: string): Promise<void> {
  const res = await fetch(`${config.supabaseUrl}/storage/v1/object/gallery/${objectPath(path)}`, { method: 'DELETE', headers: await headers() })
  if (!res.ok && res.status !== 404) throw new BackendError(`Couldn’t delete the file (${res.status})`, null, res.status)
}

/** Every file in the signed-in login's gallery folder, removed in batches (account deletion). */
async function deleteMyGalleryFiles(): Promise<void> {
  const uid = getSession()?.user.id
  if (!uid || !isBackendConfigured()) return
  const limit = 1000
  const paths: string[] = []
  // List everything first: deleting while paging would shift the offsets.
  for (let offset = 0; ; offset += limit) {
    const items = await request<{ name: string; id: string | null }[]>('/storage/v1/object/list/gallery', {
      method: 'POST',
      body: JSON.stringify({ prefix: uid, limit, offset }),
    })
    for (const it of items ?? []) if (it.id && it.name) paths.push(`${uid}/${it.name}`)
    if (!items || items.length < limit) break
  }
  for (let i = 0; i < paths.length; i += limit) {
    await request('/storage/v1/object/gallery', { method: 'DELETE', body: JSON.stringify({ prefixes: paths.slice(i, i + limit) }) })
  }
}

/** The profile's photos, newest first, with signed URLs. */
export async function listPhotos(profileId: string): Promise<Photo[]> {
  const rows = (await rpc<PhotoRow[] | null>('gallery_list', { p_profile_id: profileId })) ?? []
  // A signing hiccup shouldn't hide the list: tiles then show "Image unavailable" until the next re-sign.
  const signed = await signGalleryPaths(rows.map((r) => r.storage_path)).catch((): SignedUrls => ({ urls: new Map(), expiresAt: 0 }))
  return rows.map((r) => toPhoto(r, signed))
}

/**
 * Manual upload: shrinks the picture in the browser (≤ 1600 px JPEG), uploads it to the login's
 * folder and saves its details. No location check (camera captures go through features/camera).
 * Throws BackendError 42501 when nobody is signed in, ImageReadError for unreadable files.
 */
export async function uploadPhoto(profileId: string, file: Blob, meta: PhotoMeta = {}): Promise<Photo> {
  const image = await prepareImage(file)
  const path = await uploadGalleryImage(image.blob)
  const city = meta.city ?? null
  let row: PhotoRow
  try {
    row = await rpc<PhotoRow>('gallery_add_photo', {
      p_profile_id: profileId,
      p_storage_path: path,
      p_meta: {
        city_name: city?.name ?? null,
        country: city?.country ?? null,
        country_code: city?.countryCode ?? null,
        place_id: city?.placeId ?? null,
        lat: city?.lat ?? null,
        lng: city?.lng ?? null,
        caption: meta.caption?.trim() || null,
        quest_id: meta.questId ?? null,
        hunt_id: meta.huntId ?? null,
        taken_at: meta.takenAt ? new Date(meta.takenAt).toISOString() : null,
        width: image.width,
        height: image.height,
      },
    })
  } catch (e) {
    // Don't leave an orphan file behind when the details couldn't be saved.
    await deleteGalleryFile(path).catch(() => undefined)
    throw e
  }
  const signed = await signGalleryPaths([path]).catch((): SignedUrls => ({ urls: new Map(), expiresAt: 0 }))
  return toPhoto(row, signed)
}

/**
 * Deletes the photo's record, then its file (best effort). For a landmark photo the visit itself
 * stays: discoveries are kept apart from photos.
 */
export async function deletePhoto(profileId: string, photoId: string): Promise<void> {
  const path = await rpc<string>('gallery_delete_photo', { p_profile_id: profileId, p_photo_id: photoId })
  if (path) await deleteGalleryFile(path).catch(() => undefined)
}

// ---- Points, quests & shop (011_economy.sql) ----------------------------------------
// The server owns the economy: these send ids only (never an amount or a price) and each write
// returns the fresh EconomyState (camelCase jsonb, features/economy/types.ts). Errors such as
// 'Daily refresh already used' or 'Not enough points' come back as BackendError messages to show
// as is. lib/economy/server.ts wraps these as an EconomyApi.

export type EconomyPage = 'map' | 'shop' | 'gallery' | 'chat' | 'quests'

/** Raw EconomyState from the server (lib/economy normalises it). */
export const economyState = (profileId: string) => rpc<unknown>('economy_state', { p_profile_id: profileId })

export const economyClaim = (profileId: string, assignmentId: string) =>
  rpc<unknown>('economy_claim', { p_profile_id: profileId, p_assignment_id: assignmentId })

export const economyRefreshDaily = (profileId: string, assignmentId: string) =>
  rpc<unknown>('economy_refresh_daily', { p_profile_id: profileId, p_assignment_id: assignmentId })

export const economyPurchase = (profileId: string, itemId: string) =>
  rpc<unknown>('economy_purchase', { p_profile_id: profileId, p_item_id: itemId })

/** itemId null = take off whatever is in that slot. */
export const economyEquip = (profileId: string, slot: string, itemId: string | null) =>
  rpc<unknown>('economy_equip', { p_profile_id: profileId, p_slot: slot, p_item_id: itemId })

export async function economyRecordVisit(profileId: string, page: EconomyPage): Promise<void> {
  await rpc<unknown>('economy_record_visit', { p_profile_id: profileId, p_page: page })
}

export async function economySetTimezone(profileId: string, tz: string): Promise<void> {
  await rpc<unknown>('economy_set_timezone', { p_profile_id: profileId, p_tz: tz })
}
