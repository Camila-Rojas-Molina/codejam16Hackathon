// The quest rules: which quests a person gets each period, and how far along they are.
//
// Device-only mode (lib/economy/device.ts) runs these functions directly. The server implements
// the SAME rules in SQL (backend/supabase/migrations/007_economy.sql), so keep both in step and
// keep this file free of React and browser-only APIs (Intl is fine).
//
// Periods, in the person's timezone:
//   weekly     'w:2026-W48'          ISO week, Monday 00:00 → next Monday 00:00. 1 slot.
//   daily      'd:2026-11-23:<1-3>'  calendar day, 00:00 → 00:00. 3 slots, 1 refresh a day.
//   adventure  'a:2026-W48:<1-3>'    same week as weekly. 3 slots.
//   starter    'starter'             never expires; one assignment per starter quest.
//
// Progress is computed from stored facts only, never self-reported. Period quests count what
// happened inside their period; starter quests count everything ever.
import { QUEST_DEFS, conditionTarget } from './catalog'
import {
  DAILY_REFRESHES,
  QUEST_SLOTS,
  type QuestAssignment,
  type QuestCategory,
  type QuestCondition,
  type QuestDef,
} from '../economy/types'

// ---- Facts: what progress is computed from ----------------------------------------------------

export type VisitPage = Extract<QuestCondition, { type: 'visit' }>['page']
export type ProfileCheck = Extract<QuestCondition, { type: 'profile' }>['check']

/** Everything progress may look at. Times are ms since epoch. */
export type QuestFacts = {
  /** Completed GPS-checked photo hunts. */
  huntResults: { huntId: string; completedAt: number; withPartner?: boolean; kind?: string }[]
  /** Gallery photos. `at` = when it was uploaded (not when it says it was taken). */
  photos: { at: number; city: { name: string; placeId: string | null } | null }[]
  /** "Where have you explored?" cities. Only ones with a placeId count as pinned. */
  cities: { placeId: string | null; addedAt: number }[]
  profile: {
    questionnaireComplete: boolean
    homeCityPinned: boolean
    avatarChosen: boolean
    bothModesReady: boolean
  }
  /** Page visits recorded by the app (EconomyApi.recordVisit). */
  visits: { page: VisitPage; at: number }[]
  /** Claimed quests, any category. */
  completedQuests: { defId: string; category: QuestCategory; completedAt: number }[]
  purchases: { itemId: string; at: number }[]
  /** Item ids worn or set as backdrop right now. */
  equipped: string[]
}

/** [from, to) in ms. Undefined = all time. */
export type TimeWindow = { from: number; to: number }

const inWindow = (at: number, w?: TimeWindow) => !w || (at >= w.from && at < w.to)

/** Same key the server uses for "different cities": the place id, else the lower-cased name. */
export const cityKey = (city: { name: string; placeId: string | null }) => city.placeId ?? city.name.trim().toLowerCase()

/**
 * How far along a quest is. `progress` never exceeds `target`.
 * photos + distinctCities: the first photo from each city (up to distinctCities) counts, then
 * any further photos fill the rest of `count`. target = max(count, distinctCities).
 */
export function evaluateProgress(def: Pick<QuestDef, 'condition'>, facts: QuestFacts, window?: TimeWindow): { progress: number; target: number } {
  const target = conditionTarget(def)
  const raw = rawProgress(def.condition, facts, window)
  return { progress: Math.max(0, Math.min(target, raw)), target }
}

function rawProgress(c: QuestCondition, f: QuestFacts, w?: TimeWindow): number {
  switch (c.type) {
    case 'hunts': {
      let hunts = f.huntResults.filter((h) => inWindow(h.completedAt, w))
      if (c.withPartner) hunts = hunts.filter((h) => h.withPartner)
      if (c.huntKinds?.length) hunts = hunts.filter((h) => h.kind && c.huntKinds!.includes(h.kind))
      return c.distinctHunts ? new Set(hunts.map((h) => h.huntId)).size : hunts.length
    }
    case 'photos': {
      let photos = f.photos.filter((p) => inWindow(p.at, w))
      if (c.requireCity || c.distinctCities) photos = photos.filter((p) => p.city && p.city.name.trim())
      if (!c.distinctCities) return photos.length
      const cities = new Set(photos.map((p) => cityKey(p.city!))).size
      const cityPart = Math.min(cities, c.distinctCities)
      const rest = Math.max(0, c.count - c.distinctCities)
      return cityPart + Math.min(photos.length - cityPart, rest)
    }
    case 'new_cities':
      return new Set(f.cities.filter((x) => x.placeId && inWindow(x.addedAt, w)).map((x) => x.placeId)).size
    case 'profile':
      return profileFact(c.check, f) ? 1 : 0
    case 'visit':
      return f.visits.some((v) => v.page === c.page && inWindow(v.at, w)) ? 1 : 0
    case 'quests_completed':
      return f.completedQuests.filter((q) => (!c.categories?.length || c.categories.includes(q.category)) && inWindow(q.completedAt, w)).length
    case 'purchases':
      return f.purchases.filter((p) => inWindow(p.at, w)).length
    case 'equipped':
      return f.equipped.length
  }
}

function profileFact(check: ProfileCheck, f: QuestFacts): boolean {
  switch (check) {
    case 'questionnaire_complete':
      return f.profile.questionnaireComplete
    case 'home_city_pinned':
      return f.profile.homeCityPinned
    case 'avatar_chosen':
      return f.profile.avatarChosen
    case 'both_modes_ready':
      return f.profile.bothModesReady
    case 'first_city':
      return f.cities.length > 0
  }
}

/** Progress for one assignment, counted inside its own period. Unknown defs keep stored values. */
export function assignmentProgress(a: Pick<QuestAssignment, 'defId' | 'periodKey' | 'progress' | 'target'>, facts: QuestFacts, timezone: string, defs: QuestDef[] = QUEST_DEFS) {
  const def = defs.find((d) => d.id === a.defId)
  if (!def) return { progress: a.progress, target: a.target }
  return evaluateProgress(def, facts, periodWindow(a.periodKey, timezone) ?? undefined)
}

// ---- Time: days and ISO weeks in a timezone --------------------------------------------------

const DAY_MS = 86_400_000

function safeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}

/** Local calendar parts of an instant in a timezone. */
function zonedParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour') % 24, mm: get('minute'), ss: get('second') }
}

/** Offset of `tz` from UTC at an instant, in ms (positive east of Greenwich). */
function zoneOffset(ms: number, tz: string): number {
  const p = zonedParts(ms, tz)
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - (ms - (((ms % 1000) + 1000) % 1000))
}

/** The instant local midnight starts on y-m-d in tz (DST-safe for real-world zones). */
function zonedMidnight(y: number, m: number, d: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d)
  const first = guess - zoneOffset(guess, tz)
  const second = guess - zoneOffset(first, tz)
  return second
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Adds days to a calendar date (no timezone involved). */
function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

function isoWeekOf(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m - 1, d))
  const weekday = (t.getUTCDay() + 6) % 7 // Monday = 0
  const thursday = new Date(t.getTime() + (3 - weekday) * DAY_MS)
  const isoYear = thursday.getUTCFullYear()
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(isoYear, 0, 1)) / DAY_MS / 7)
  return { key: `${isoYear}-W${pad(week)}`, weekday }
}

export type Periods = {
  timezone: string
  day: { date: string; start: number; end: number }
  week: { isoWeek: string; start: number; end: number }
}

/** The current day and ISO week for an instant, in a timezone (invalid zones fall back to UTC). */
export function periodsAt(now: number, timezone: string): Periods {
  const tz = safeZone(timezone)
  const p = zonedParts(now, tz)
  const next = addDays(p.y, p.m, p.d, 1)
  const { key, weekday } = isoWeekOf(p.y, p.m, p.d)
  const monday = addDays(p.y, p.m, p.d, -weekday)
  const nextMonday = addDays(monday.y, monday.m, monday.d, 7)
  return {
    timezone: tz,
    day: { date: ymd(p.y, p.m, p.d), start: zonedMidnight(p.y, p.m, p.d, tz), end: zonedMidnight(next.y, next.m, next.d, tz) },
    week: { isoWeek: key, start: zonedMidnight(monday.y, monday.m, monday.d, tz), end: zonedMidnight(nextMonday.y, nextMonday.m, nextMonday.d, tz) },
  }
}

/** Monday of an ISO week ('2026-W48') as a calendar date. */
function mondayOfIsoWeek(isoWeek: string) {
  const [yy, ww] = isoWeek.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(yy, 0, 4))
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7
  const t = new Date(jan4.getTime() + (-jan4Weekday + (ww - 1) * 7) * DAY_MS)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** The time window a period key covers. Null for 'starter' (all time) or a key it can't read. */
export function periodWindow(periodKey: string, timezone: string): TimeWindow | null {
  const tz = safeZone(timezone)
  const [kind, value] = periodKey.split(':')
  if ((kind === 'w' || kind === 'a') && /^\d{4}-W\d{2}$/.test(value ?? '')) {
    const mon = mondayOfIsoWeek(value)
    const next = addDays(mon.y, mon.m, mon.d, 7)
    return { from: zonedMidnight(mon.y, mon.m, mon.d, tz), to: zonedMidnight(next.y, next.m, next.d, tz) }
  }
  if (kind === 'd' && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    const [y, m, d] = value.split('-').map(Number)
    const next = addDays(y, m, d, 1)
    return { from: zonedMidnight(y, m, d, tz), to: zonedMidnight(next.y, next.m, next.d, tz) }
  }
  return null
}

export const weeklyKey = (p: Periods) => `w:${p.week.isoWeek}`
export const dailyKey = (p: Periods, slot: number) => `d:${p.day.date}:${slot}`
export const adventureKey = (p: Periods, slot: number) => `a:${p.week.isoWeek}:${slot}`
export const STARTER_KEY = 'starter'

// ---- Seeded randomness -----------------------------------------------------------------------

/** FNV-1a, 32-bit. The SQL side uses the same hash so a period is stable on both. */
export function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}
/** Stable number in [0, 1) for a seed. */
const unit = (text: string) => hash32(text) / 0x1_0000_0000

// ---- Issuing ---------------------------------------------------------------------------------

/** What personalisation reads about the person (from their profile and active mode). */
export type QuestPerson = {
  mode: 'tourist' | 'local' | null
  /** Interest ids (features/profile/options.ts INTEREST_OPTIONS); for tourists, the trip's too. */
  interests: string[]
  /** Accessibility need ids (ACCESSIBILITY_OPTIONS): universal plus the active trip's. */
  accessibility: string[]
  /** PACE_OPTIONS id or null. */
  pace: string | null
  /** Has finished at least one hunt with a teammate. Companion-only quests lean on this. */
  hasTeamedUp: boolean
}

export type ExistingAssignment = Pick<QuestAssignment, 'id' | 'defId' | 'category' | 'periodKey' | 'status' | 'assignedAt'>

export type IssueInput = {
  now: number
  timezone: string
  /** Stable per person (e.g. the account id): the same person gets the same picks for a period. */
  seed: string
  person: QuestPerson
  /** Every assignment this person has, any status (to see filled slots and avoid repeats). */
  existing: ExistingAssignment[]
  /** Defaults to the catalogue. */
  defs?: QuestDef[]
}

export type IssueResult = {
  /** New assignments to store (status 'active', progress 0: compute progress afterwards). */
  issue: QuestAssignment[]
  /** Ids of active, unclaimed assignments whose period is over: mark them 'expired'. */
  expire: string[]
  periods: Periods
}

/** How far back a quest counts as "recent" (not offered again). */
const RECENT_MS: Record<Exclude<QuestCategory, 'starter'>, number> = {
  daily: 3 * DAY_MS,
  weekly: 28 * DAY_MS,
  adventure: 14 * DAY_MS,
}

/** Random spread added to each score: bigger = more variety, smaller = more personal. */
const JITTER: Record<Exclude<QuestCategory, 'starter'>, number> = { daily: 4, weekly: 3, adventure: 2.5 }

const PACE_EFFORT: Record<string, Record<NonNullable<QuestDef['effort']>, number>> = {
  relaxed: { light: 2, moderate: 0.5, big: -2 },
  balanced: { light: 1, moderate: 2, big: 0 },
  fast: { light: 0, moderate: 1, big: 2 },
  spontaneous: { light: 1, moderate: 1, big: 1 },
}

/** Can this person be offered this quest at all? */
export function eligible(def: QuestDef, person: QuestPerson): boolean {
  if (def.retired) return false
  if (def.modes?.length && (!person.mode || !def.modes.includes(person.mode))) return false
  if (def.avoidFor?.some((need) => person.accessibility.includes(need))) return false
  // A single-slot weekly can't sit next to a solo option, so companion weeklies need a track record.
  if (def.category === 'weekly' && def.company === 'companion' && !person.hasTeamedUp) return false
  return true
}

/** How well a quest suits the person (before randomness). Higher = better. */
export function personalScore(def: QuestDef, person: QuestPerson): number {
  let score = 0
  const interests = def.interests ?? []
  if (interests.length === 0) score += 2
  else {
    const overlap = interests.filter((i) => person.interests.includes(i)).length
    score += overlap > 0 ? 3 + overlap : 0
  }
  if (def.modes?.length && person.mode && def.modes.includes(person.mode)) score += 1
  if (def.effort && person.pace && PACE_EFFORT[person.pace]) score += PACE_EFFORT[person.pace][def.effort]
  if (def.effort === 'big' && person.accessibility.includes('rest-stops')) score -= 1
  if (def.company === 'companion' && !person.hasTeamedUp) score -= 1
  return score
}

/** The person's interest that made a quest relevant (for "Because you like …"), if any. */
export function matchedInterests(def: QuestDef, person: Pick<QuestPerson, 'interests'>): string[] {
  return (def.interests ?? []).filter((i) => person.interests.includes(i))
}

const isLive = (a: ExistingAssignment) => a.status !== 'replaced'

function recentDefIds(existing: ExistingAssignment[], category: Exclude<QuestCategory, 'starter'>, now: number): Set<string> {
  const since = now - RECENT_MS[category]
  return new Set(existing.filter((a) => a.category === category && Date.parse(a.assignedAt) >= since).map((a) => a.defId))
}

/**
 * Picks one quest for a slot. `taken` = quests already in this period's other slots (their defs).
 * Rules: eligible only; never a def already in this period; prefer not-recent; at most one
 * companion-only quest per period; spread condition types (dailies) and themes (adventures).
 */
function pick(
  category: Exclude<QuestCategory, 'starter'>,
  candidates: QuestDef[],
  taken: QuestDef[],
  avoid: Set<string>,
  recent: Set<string>,
  person: QuestPerson,
  salt: string,
): QuestDef | null {
  const companionTaken = taken.some((d) => d.company === 'companion')
  const ok = candidates.filter((d) => !avoid.has(d.id) && !(companionTaken && d.company === 'companion'))
  const fresh = ok.filter((d) => !recent.has(d.id))
  const pool = fresh.length > 0 ? fresh : ok
  let best: QuestDef | null = null
  let bestScore = -Infinity
  for (const d of pool) {
    let s = personalScore(d, person) + unit(`${salt}|${d.id}`) * JITTER[category]
    if (category === 'daily' && taken.some((t) => t.condition.type === d.condition.type)) s -= 1.5
    if (category === 'adventure') {
      const theme = d.interests?.[0]
      if (theme && taken.some((t) => t.interests?.[0] === theme)) s -= 2
      if (taken.some((t) => t.condition.type === d.condition.type && d.condition.type === 'hunts')) s -= 1
    }
    if (s > bestScore) {
      bestScore = s
      best = d
    }
  }
  // At most one companion-only quest per period, so the other slots are always doable alone
  // (and the single weekly slot only offers one when eligible() allows it).
  return best
}

function makeAssignment(def: QuestDef, periodKey: string, now: number, expiresAt: number | null): QuestAssignment {
  return {
    id: `${periodKey}:${def.id}`,
    defId: def.id,
    category: def.category,
    periodKey,
    status: 'active',
    progress: 0,
    target: conditionTarget(def),
    claimable: false,
    assignedAt: new Date(now).toISOString(),
    expiresAt: expiresAt === null ? null : new Date(expiresAt).toISOString(),
    completedAt: null,
    reward: def.reward,
  }
}

/**
 * Fills every empty slot for the current periods and lists assignments that have expired.
 * Idempotent: calling it again in the same period issues nothing new.
 */
export function issueAssignments(input: IssueInput): IssueResult {
  const { now, seed, person } = input
  const defs = input.defs ?? QUEST_DEFS
  const periods = periodsAt(now, input.timezone)
  const live = input.existing.filter(isLive)
  const byId = new Map(defs.map((d) => [d.id, d]))
  const issue: QuestAssignment[] = []

  const expire = input.existing
    .filter((a) => a.status === 'active' && a.periodKey !== STARTER_KEY && !isCurrentKey(a.periodKey, periods))
    .map((a) => a.id)

  const fill = (category: Exclude<QuestCategory, 'starter'>, keys: string[], periodPrefix: string, expiresAt: number) => {
    const inPeriod = [...live, ...issue].filter((a) => a.category === category && a.periodKey.startsWith(periodPrefix))
    const everInPeriod = input.existing.filter((a) => a.category === category && a.periodKey.startsWith(periodPrefix))
    const taken = inPeriod.map((a) => byId.get(a.defId)).filter((d): d is QuestDef => !!d)
    const avoid = new Set([...inPeriod, ...everInPeriod].map((a) => a.defId))
    const recent = recentDefIds(input.existing, category, now)
    const candidates = defs.filter((d) => d.category === category && eligible(d, person))
    for (const key of keys) {
      if (inPeriod.some((a) => a.periodKey === key)) continue
      const def = pick(category, candidates, taken, avoid, recent, person, `${seed}|${periodPrefix}`)
      if (!def) continue
      const a = makeAssignment(def, key, now, expiresAt)
      issue.push(a)
      taken.push(def)
      avoid.add(def.id)
    }
  }

  fill('weekly', [weeklyKey(periods)], weeklyKey(periods), periods.week.end)
  fill('daily', slots(QUEST_SLOTS.daily).map((s) => dailyKey(periods, s)), `d:${periods.day.date}:`, periods.day.end)
  fill('adventure', slots(QUEST_SLOTS.adventure).map((s) => adventureKey(periods, s)), `a:${periods.week.isoWeek}:`, periods.week.end)

  // Starter quests: one each, issued once, never expire.
  const haveStarter = new Set(input.existing.filter((a) => a.category === 'starter').map((a) => a.defId))
  for (const def of defs) {
    if (def.category === 'starter' && !def.retired && !haveStarter.has(def.id)) issue.push(makeAssignment(def, STARTER_KEY, now, null))
  }

  return { issue, expire, periods }
}

const slots = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

function isCurrentKey(periodKey: string, p: Periods): boolean {
  return periodKey === weeklyKey(p) || periodKey.startsWith(`d:${p.day.date}:`) || periodKey.startsWith(`a:${p.week.isoWeek}:`)
}

// ---- Daily refresh ---------------------------------------------------------------------------

/** Daily refreshes already used today (replaced dailies with today's key). */
export function dailyRefreshesUsed(existing: ExistingAssignment[], periods: Periods): number {
  return existing.filter((a) => a.category === 'daily' && a.status === 'replaced' && a.periodKey.startsWith(`d:${periods.day.date}:`)).length
}

export function dailyRefreshAvailable(existing: ExistingAssignment[], now: number, timezone: string): boolean {
  return dailyRefreshesUsed(existing, periodsAt(now, timezone)) < DAILY_REFRESHES
}

export type RefreshResult =
  | { ok: true; replace: string; issue: QuestAssignment }
  | { ok: false; reason: 'not-found' | 'not-today' | 'not-active' | 'already-done' | 'no-refresh-left' | 'nothing-else' }

/**
 * Swaps one of today's unfinished dailies for a different one (same slot). The caller marks the
 * old one 'replaced' and stores the new one. Pass `claimable` = whether the old one is finished.
 */
export function refreshDailyAssignment(input: IssueInput, assignmentId: string, opts: { claimable: boolean }): RefreshResult {
  const defs = input.defs ?? QUEST_DEFS
  const periods = periodsAt(input.now, input.timezone)
  const old = input.existing.find((a) => a.id === assignmentId)
  if (!old || old.category !== 'daily') return { ok: false, reason: 'not-found' }
  if (!old.periodKey.startsWith(`d:${periods.day.date}:`)) return { ok: false, reason: 'not-today' }
  if (old.status !== 'active') return { ok: false, reason: 'not-active' }
  if (opts.claimable) return { ok: false, reason: 'already-done' }
  if (dailyRefreshesUsed(input.existing, periods) >= DAILY_REFRESHES) return { ok: false, reason: 'no-refresh-left' }

  const prefix = `d:${periods.day.date}:`
  const byId = new Map(defs.map((d) => [d.id, d]))
  const today = input.existing.filter((a) => a.category === 'daily' && a.periodKey.startsWith(prefix))
  const taken = today.filter((a) => isLive(a) && a.id !== old.id).map((a) => byId.get(a.defId)).filter((d): d is QuestDef => !!d)
  const avoid = new Set(today.map((a) => a.defId))
  const candidates = defs.filter((d) => d.category === 'daily' && eligible(d, input.person))
  const def = pick('daily', candidates, taken, avoid, recentDefIds(input.existing, 'daily', input.now), input.person, `${input.seed}|${old.periodKey}|refresh`)
  if (!def) return { ok: false, reason: 'nothing-else' }
  return { ok: true, replace: old.id, issue: makeAssignment(def, old.periodKey, input.now, periods.day.end) }
}
