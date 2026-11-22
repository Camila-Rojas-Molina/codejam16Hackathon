// The quest rules: which quests a person is offered, and how far along a quest is.
//
// Device-only mode (lib/economy/device.ts) runs these functions directly; it owns periods, slots,
// storage and the refresh limit. The server implements the SAME rules in SQL
// (backend/supabase/migrations/007_economy.sql), so keep both in step. No React in here.
//
// Periods (decided by the caller, in the person's timezone):
//   weekly     'w:2026-W48'          ISO week, Monday 00:00 → next Monday. 1 slot.
//   daily      'd:2026-11-23:<1-3>'  calendar day. 3 slots, 1 refresh a day.
//   adventure  'a:2026-W48:<1-3>'    same week as weekly. 3 slots.
//   starter    'starter'             never expires; one each.
//
// Progress is computed from stored facts only, never self-reported. The caller passes facts
// already limited to the quest's period (all time for starter quests).
import { hasUniversalProfile } from '../profile/flow'
import { activeTrip, isModeReady } from '../profile/model'
import type { Account, ProfileRecord } from '../profile/types'
import { QUEST_DEFS, conditionTarget } from './catalog'
import type { QuestCategory, QuestCondition, QuestDef } from '../economy/types'

// ---- Facts & progress --------------------------------------------------------------------------

export type VisitPage = Extract<QuestCondition, { type: 'visit' }>['page']
export type ProfileCheck = Extract<QuestCondition, { type: 'profile' }>['check']

/**
 * Everything progress may count, ALREADY limited to the quest's period by the caller.
 * Times are ms since epoch.
 */
export type ProgressFacts = {
  /** For the 'profile' checks (and personalisation). Null = not loaded / someone else's. */
  profile: ProfileRecord | null
  account: Account | null
  /** GPS-checked photo hunts finished in the period. withPartner = the team had two members. */
  hunts: { huntId: string; at: number; withPartner: boolean; kind?: string }[]
  /** Gallery photos uploaded in the period. */
  photos: { at: number; city: { name: string; placeId: string | null } | null }[]
  /** Cities pinned (with a placeId) to "Where have you explored?" in the period. */
  newCities: { placeId: string; at: number }[]
  /** How many times each page was opened in the period. */
  visits: Partial<Record<VisitPage, number>>
  /** Quests claimed in the period. */
  questsCompleted: { category: QuestCategory; at: number }[]
  /** Purchases in the period. */
  purchases: number
  /** Items worn (or set as backdrop) right now. */
  equipped: number
}
/** Alias: the facts a quest's progress is computed from. */
export type QuestFacts = ProgressFacts

/** Same key the server uses for "different cities": the place id, else the lower-cased name. */
export const cityKey = (city: { name: string; placeId: string | null }) => city.placeId ?? city.name.trim().toLowerCase()

/**
 * How far along a quest is: { progress, target }, progress never above target.
 *   hunts          count (distinct hunt ids with distinctHunts; only team-of-two with withPartner;
 *                  only the listed kinds with huntKinds)
 *   photos         count; requireCity / distinctCities only count photos with a city. With
 *                  distinctCities the first photo from each city (up to distinctCities) counts, then
 *                  further photos fill the rest of count. target = max(count, distinctCities)
 *   new_cities     distinct pinned place ids
 *   profile        0 or 1 (see profileCheck)
 *   visit          0 or 1
 *   quests_completed / purchases / equipped: counts
 */
export function evaluateProgress(def: Pick<QuestDef, 'condition'>, facts: ProgressFacts): { progress: number; target: number } {
  const target = conditionTarget(def)
  const raw = rawProgress(def.condition, facts)
  return { progress: Math.max(0, Math.min(target, raw)), target }
}

function rawProgress(c: QuestCondition, f: ProgressFacts): number {
  switch (c.type) {
    case 'hunts': {
      let hunts = f.hunts
      if (c.withPartner) hunts = hunts.filter((h) => h.withPartner)
      if (c.huntKinds?.length) hunts = hunts.filter((h) => !!h.kind && c.huntKinds!.includes(h.kind))
      return c.distinctHunts ? new Set(hunts.map((h) => h.huntId)).size : hunts.length
    }
    case 'photos': {
      const photos = c.requireCity || c.distinctCities ? f.photos.filter((p) => !!p.city?.name.trim()) : f.photos
      if (!c.distinctCities) return photos.length
      const cityPart = Math.min(new Set(photos.map((p) => cityKey(p.city!))).size, c.distinctCities)
      return cityPart + Math.min(photos.length - cityPart, Math.max(0, c.count - c.distinctCities))
    }
    case 'new_cities':
      return new Set(f.newCities.map((x) => x.placeId)).size
    case 'profile':
      return profileCheck(c.check, f.profile, f.account) ? 1 : 0
    case 'visit':
      return (f.visits[c.page] ?? 0) > 0 ? 1 : 0
    case 'quests_completed':
      return f.questsCompleted.filter((q) => !c.categories?.length || c.categories.includes(q.category)).length
    case 'purchases':
      return f.purchases
    case 'equipped':
      return f.equipped
  }
}

/** The profile facts starter quests check (the server reads the same columns). */
export function profileCheck(check: ProfileCheck, profile: ProfileRecord | null, account: Account | null): boolean {
  const u = profile?.universal
  switch (check) {
    case 'questionnaire_complete':
      return hasUniversalProfile(profile)
    case 'home_city_pinned':
      return !!(u?.homeCityPlace || profile?.local?.homeCityPlace)
    case 'avatar_chosen':
      return !!account?.avatar
    case 'both_modes_ready':
      return isModeReady(profile, 'tourist') && isModeReady(profile, 'local')
    case 'first_city':
      return (u?.citiesDiscovered.length ?? 0) > 0
  }
}

// ---- Personalisation ---------------------------------------------------------------------------

/** What personalisation reads about the person. */
export type QuestPerson = {
  mode: 'tourist' | 'local' | null
  /** Interest ids (profile/options INTEREST_OPTIONS): universal, plus the active trip's for tourists. */
  interests: string[]
  /** Accessibility need ids (ACCESSIBILITY_OPTIONS): universal, plus the active trip's for tourists. */
  accessibility: string[]
  /** PACE_OPTIONS id, or null. */
  pace: string | null
  /** Has finished a hunt with a teammate before. Unknown = false (never assume a companion). */
  hasTeamedUp: boolean
}

export function personFrom(profile: ProfileRecord | null, opts: { hasTeamedUp?: boolean } = {}): QuestPerson {
  const u = profile?.universal
  const mode = profile?.activeMode ?? null
  const trip = mode === 'tourist' ? activeTrip(profile) : null
  return {
    mode,
    interests: [...new Set([...(u?.interests ?? []), ...(trip?.interests ?? [])])],
    accessibility: [...new Set([...(u?.accessibility.needs ?? []), ...(trip?.accessibility.needs ?? [])])],
    pace: u?.exploration.pace ?? null,
    hasTeamedUp: !!opts.hasTeamedUp,
  }
}

/** The city {city} stands for: the trip destination (tourist) or the home/hosting city (local). */
export function questCity(profile: ProfileRecord | null): string | null {
  if (!profile) return null
  if (profile.activeMode === 'tourist') return activeTrip(profile)?.destination?.trim() || null
  return profile.local?.homeCity?.trim() || profile.universal?.homeCity?.trim() || null
}

/** Can this person be offered this quest at all? */
export function eligible(def: QuestDef, person: QuestPerson): boolean {
  if (def.retired) return false
  if (def.modes?.length && (!person.mode || !def.modes.includes(person.mode))) return false
  if (def.avoidFor?.some((need) => person.accessibility.includes(need))) return false
  // The single weekly slot has nothing alongside it, so a companion-only weekly needs a track record.
  if (def.category === 'weekly' && def.company === 'companion' && !person.hasTeamedUp) return false
  return true
}

const PACE_EFFORT: Record<string, Record<NonNullable<QuestDef['effort']>, number>> = {
  relaxed: { light: 2, moderate: 0.5, big: -2 },
  balanced: { light: 1, moderate: 2, big: 0 },
  fast: { light: 0, moderate: 1, big: 2 },
  spontaneous: { light: 1, moderate: 1, big: 1 },
}

/** How well a quest suits the person, before randomness. Higher = better. */
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

/** The person's interests that make a quest relevant ("Because you like …"). */
export function matchedInterests(def: Pick<QuestDef, 'interests'>, interests: readonly string[]): string[] {
  return (def.interests ?? []).filter((i) => interests.includes(i))
}

// ---- Seeded randomness -------------------------------------------------------------------------

/** FNV-1a, 32-bit. Use the same in SQL so a period's picks are stable on both sides. */
export function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}
const unit = (text: string) => hash32(text) / 0x1_0000_0000

/** Random spread added to each score: bigger = more variety, smaller = more personal. */
const JITTER: Record<Exclude<QuestCategory, 'starter'>, number> = { daily: 4, weekly: 3, adventure: 2.5 }

// ---- Issuing -----------------------------------------------------------------------------------

export type IssueInput = {
  category: Exclude<QuestCategory, 'starter'>
  /** How many to pick (the empty slots). */
  count: number
  profile: ProfileRecord | null
  /**
   * Def ids not to offer: everything active now and everything already handed out this period
   * (replaced ones included, so a refresh is really new). Those of the same category also count as
   * "already in this period" for the variety rules (one companion-only at most, mixed themes).
   */
  exclude: string[]
  /** Def ids offered in recent periods: avoided while anything else fits. */
  recent?: string[]
  /** Stable for the person and period (e.g. '<account>:a:2026-W48:2'): same input → same picks. */
  seed: string
  /** Overrides what personFrom(profile) can't know (e.g. hasTeamedUp from hunt history). */
  person?: Partial<QuestPerson>
  /** Defaults to the catalogue. */
  defs?: QuestDef[]
}

/**
 * Picks `count` quests for one category, best-suited first:
 *   * eligible only (mode, accessibility needs, not retired);
 *   * scored by interest overlap, mode, pace ↔ effort, plus seeded jitter for variety;
 *   * never an excluded id, recent ones only if nothing else fits;
 *   * at most ONE companion-only quest among the period's quests, so there is always a solo/either
 *     option next to it (a companion-only weekly needs hasTeamedUp, see eligible());
 *   * dailies spread across condition types, adventures across themes.
 */
export function issueAssignments(input: IssueInput): QuestDef[] {
  const defs = input.defs ?? QUEST_DEFS
  const person = { ...personFrom(input.profile), ...input.person }
  const byId = new Map(defs.map((d) => [d.id, d]))
  const exclude = new Set(input.exclude)
  const recent = new Set(input.recent ?? [])
  const taken = input.exclude.map((id) => byId.get(id)).filter((d): d is QuestDef => !!d && d.category === input.category)
  const candidates = defs.filter((d) => d.category === input.category && eligible(d, person))
  const picked: QuestDef[] = []

  for (let n = 0; n < input.count; n++) {
    const inPeriod = [...taken, ...picked]
    const companionTaken = inPeriod.some((d) => d.company === 'companion')
    const ok = candidates.filter((d) => !exclude.has(d.id) && !picked.includes(d) && !(companionTaken && d.company === 'companion'))
    const fresh = ok.filter((d) => !recent.has(d.id))
    const pool = fresh.length > 0 ? fresh : ok
    let best: QuestDef | null = null
    let bestScore = -Infinity
    for (const d of pool) {
      let s = personalScore(d, person) + unit(`${input.seed}|${d.id}`) * JITTER[input.category]
      if (input.category === 'daily' && inPeriod.some((t) => t.condition.type === d.condition.type)) s -= 1.5
      if (input.category === 'adventure') {
        const theme = d.interests?.[0]
        if (theme && inPeriod.some((t) => t.interests?.[0] === theme)) s -= 2
        if (d.condition.type === 'hunts' && inPeriod.some((t) => t.condition.type === 'hunts')) s -= 1
      }
      if (s > bestScore) {
        bestScore = s
        best = d
      }
    }
    if (!best) break
    picked.push(best)
  }
  return picked
}
