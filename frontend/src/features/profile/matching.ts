// Structured, mode-aware input for compatibility scoring. Deliberately simple: each dimension is
// a 0–1 score, dimensions with missing data are skipped, and the total is a weighted average.
// A smarter matcher can replace compatibility() later without changing what we collect.
import { DIMENSION_WEIGHTS, UNINFERABLE_QUALITIES, rankWeight } from './matchingConfig'
import { activeTrip, dogsOf } from './model'
import type {
  AccessibilityNeed,
  BudgetLevel,
  CompanionQuality,
  DecisionStyle,
  DogSociability,
  DogStance,
  ExploreMode,
  GroupSize,
  Interest,
  Pace,
  PlanningStyle,
  ProfileRecord,
  SocialEnergy,
} from './types'

export type MatchProfile = {
  mode: ExploreMode
  /** For a tourist: the trip's interests. For a local: their universal interests. */
  interests: Interest[]
  energy?: SocialEnergy | null
  planning?: PlanningStyle | null
  pace?: Pace | null
  budget?: BudgetLevel | null
  groupSize?: GroupSize | null
  languages: string[]
  accessibilityNeeds?: AccessibilityNeed[]
  city?: string
  /** Dog stance, plus how an owner's dog gets on with other dogs. */
  dogs?: MatchDogs
  /** What they value most in an exploring buddy, most important first. */
  qualities?: CompanionQuality[]
  decisions?: DecisionStyle | null
  /** Conversation topics (a sign of curiosity). */
  topicsCount?: number
}

export type MatchDogs = { stance: DogStance | null; goodWithDogs?: DogSociability | null }

/** The effective preferences for the active mode: trip details override the universal defaults. */
export function toMatchProfile(record: ProfileRecord | null): MatchProfile | null {
  const u = record?.universal
  if (!record || !u || !record.activeMode) return null
  const base: MatchProfile = {
    mode: record.activeMode,
    interests: u.interests,
    energy: u.personality.energy,
    planning: u.personality.planning,
    pace: u.exploration.pace,
    budget: u.exploration.budget.level,
    groupSize: u.exploration.groupSize,
    languages: u.languages.preferred.length > 0 ? u.languages.preferred : u.languages.spoken,
    accessibilityNeeds: u.accessibility.needs,
    dogs: { stance: dogsOf(u).stance, goodWithDogs: dogsOf(u).dog.goodWithDogs },
    qualities: u.companion.qualities,
    decisions: u.personality.decisions,
    topicsCount: u.companion.topics.length,
  }
  if (record.activeMode === 'tourist') {
    const trip = activeTrip(record)
    if (trip) {
      base.interests = trip.interests.length > 0 ? trip.interests : u.interests
      base.budget = trip.budget.level ?? base.budget
      base.accessibilityNeeds = [...new Set([...(base.accessibilityNeeds ?? []), ...trip.accessibility.needs])]
      base.city = trip.destination
    }
  } else if (record.local) {
    base.languages = record.local.languages.length > 0 ? record.local.languages : base.languages
    base.city = record.local.homeCity
  }
  return base
}

export type Dimension = keyof typeof DIMENSION_WEIGHTS

const WEIGHTS: Record<Dimension, number> = DIMENSION_WEIGHTS

const ORDER = {
  energy: ['introvert', 'ambivert', 'extrovert'],
  planning: ['planner', 'loose-plan', 'spontaneous'],
  // "Spontaneous" pace sits between balanced and fast for distance purposes.
  pace: ['relaxed', 'balanced', 'spontaneous', 'fast'],
  budget: ['free', 'budget', 'moderate', 'comfortable', 'luxury'],
} as const

function ordinal(scale: readonly string[], a?: string | null, b?: string | null): number | undefined {
  if (!a || !b) return undefined
  const i = scale.indexOf(a)
  const j = scale.indexOf(b)
  if (i < 0 || j < 0) return undefined
  return 1 - Math.abs(i - j) / (scale.length - 1)
}

const norm = (s: string) => s.trim().toLowerCase()

export function sharedInterests(a: readonly Interest[], b: readonly Interest[]): Interest[] {
  const set = new Set(b)
  return a.filter((x) => set.has(x))
}

export function sharedLanguages(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(b.map(norm))
  return a.filter((x) => set.has(norm(x)))
}

function groupScore(a?: GroupSize | null, b?: GroupSize | null) {
  if (!a || !b) return undefined
  if (a === 'no-preference' || b === 'no-preference' || a === b) return 1
  return a === 'large-group' || b === 'large-group' ? 0.25 : 0.5
}

// ---- Ranked "great exploring buddy" qualities ------------------------------------------------------

type Signal = (p: Partial<MatchProfile>) => number | undefined
const pick = <K extends string>(v: K | null | undefined, table: Record<K, number>) => (v ? table[v] : undefined)
const avg = (...xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x !== undefined)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined
}

/**
 * How strongly someone shows each quality, read from their own answers (0–1, or undefined when
 * their answers don't say). Deliberately simple and explainable.
 */
export const QUALITY_SIGNALS: Record<CompanionQuality, Signal> = {
  chatty: (p) => pick(p.energy, { extrovert: 1, ambivert: 0.6, introvert: 0.2 }),
  calm: (p) => avg(pick(p.energy, { introvert: 1, ambivert: 0.7, extrovert: 0.35 }), pick(p.pace, { relaxed: 1, balanced: 0.7, spontaneous: 0.4, fast: 0.2 })),
  'good-listener': (p) => avg(pick(p.energy, { introvert: 0.9, ambivert: 0.7, extrovert: 0.5 }), pick(p.decisions, { together: 0.9, follow: 0.8, lead: 0.5 })),
  punctual: (p) => pick(p.planning, { planner: 1, 'loose-plan': 0.6, spontaneous: 0.2 }),
  adventurous: (p) => avg(pick(p.pace, { fast: 1, spontaneous: 0.9, balanced: 0.5, relaxed: 0.25 }), pick(p.planning, { spontaneous: 1, 'loose-plan': 0.7, planner: 0.35 })),
  easygoing: (p) =>
    avg(pick(p.planning, { 'loose-plan': 0.9, spontaneous: 0.8, planner: 0.4 }), pick(p.groupSize, { 'no-preference': 1, 'small-group': 0.7, 'one-on-one': 0.6, 'large-group': 0.7 }), pick(p.decisions, { together: 0.9, follow: 0.9, lead: 0.5 })),
  curious: (p) => (p.interests?.length || p.topicsCount ? Math.min(1, ((p.interests?.length ?? 0) + (p.topicsCount ?? 0)) / 8) : undefined),
  // Locals know their city; otherwise we can't tell.
  knowledgeable: (p) => (p.mode === 'local' ? 1 : undefined),
  funny: () => undefined,
  respectful: () => undefined,
}

/**
 * How well `other` fits what `seeker` ranked as most important, 0–1 (undefined if nothing to go on).
 * Each ranked quality counts with its rank weight (matchingConfig.ts), so the first choice dominates.
 * Qualities we can't infer count only when the other person values them too (a shared value).
 */
export function qualityFit(seeker: Partial<MatchProfile>, other: Partial<MatchProfile>): number | undefined {
  const ranked = seeker.qualities ?? []
  let sum = 0
  let weight = 0
  ranked.forEach((q, i) => {
    let score = QUALITY_SIGNALS[q]?.(other)
    if (score === undefined && UNINFERABLE_QUALITIES.includes(q) && other.qualities?.includes(q)) score = 1
    if (score === undefined) return
    const w = rankWeight(i)
    sum += score * w
    weight += w
  })
  return weight > 0 ? sum / weight : undefined
}

// ---- Dogs: a hard filter plus a bonus on top of the weighted dimensions above --------------------

/** Extra weight (at full agreement) when it applies. The dimension WEIGHTS above are unchanged. */
export const DOG_BONUS = { bothSocialDogs: 3, ownerAndLover: 1 } as const

const owns = (d?: MatchDogs) => d?.stance === 'has-dog'

/** Someone who prefers no dogs is never matched with a dog owner. */
export function dogsBlocked(a?: MatchDogs, b?: MatchDogs) {
  return (a?.stance === 'no-dogs' && owns(b)) || (b?.stance === 'no-dogs' && owns(a))
}

export function dogBonus(a?: MatchDogs, b?: MatchDogs): number {
  if (owns(a) && owns(b) && a?.goodWithDogs === 'yes' && b?.goodWithDogs === 'yes') return DOG_BONUS.bothSocialDogs
  if ((owns(a) && b?.stance === 'loves-dogs') || (owns(b) && a?.stance === 'loves-dogs')) return DOG_BONUS.ownerAndLover
  return 0
}

export type Compatibility = {
  /** 0–1, or null if there's nothing to compare yet. 0 when `blocked`. */
  total: number | null
  dimensions: Partial<Record<Dimension, number>>
  sharedInterests: Interest[]
  sharedLanguages: string[]
  /** Hard filter: never pair these two (no-dogs person + dog owner). */
  blocked: boolean
  /** Both people have a dog. */
  dogDuo: boolean
  /** Bonus weight that was added (0 if none). */
  dogBonus: number
}

export function compatibility(a: Partial<MatchProfile>, b: Partial<MatchProfile>): Compatibility {
  const interestsA = a.interests ?? []
  const interestsB = b.interests ?? []
  const shared = sharedInterests(interestsA, interestsB)
  const union = new Set([...interestsA, ...interestsB]).size
  const langs = sharedLanguages(a.languages ?? [], b.languages ?? [])

  const dims: Partial<Record<Dimension, number>> = {
    interests: union > 0 ? shared.length / union : undefined,
    languages: a.languages?.length && b.languages?.length ? (langs.length > 0 ? 1 : 0) : undefined,
    energy: ordinal(ORDER.energy, a.energy, b.energy),
    planning: ordinal(ORDER.planning, a.planning, b.planning),
    pace: ordinal(ORDER.pace, a.pace, b.pace),
    budget: ordinal(ORDER.budget, a.budget, b.budget),
    group: groupScore(a.groupSize, b.groupSize),
    // Both directions: how well each fits what the other ranked highest.
    qualities: avg(qualityFit(a, b), qualityFit(b, a)),
  }

  let sum = 0
  let weight = 0
  for (const [dim, score] of Object.entries(dims) as [Dimension, number | undefined][]) {
    if (score === undefined) {
      delete dims[dim]
      continue
    }
    sum += score * WEIGHTS[dim]
    weight += WEIGHTS[dim]
  }

  // Dog bonus: counted as a full-agreement term with its own weight, only when it applies, so
  // nobody is penalised for not having a dog and the total stays within 0–1.
  const blocked = dogsBlocked(a.dogs, b.dogs)
  const bonus = blocked ? 0 : dogBonus(a.dogs, b.dogs)
  sum += bonus
  weight += bonus

  return {
    total: blocked ? 0 : weight > 0 ? sum / weight : null,
    dimensions: dims,
    sharedInterests: shared,
    sharedLanguages: langs,
    blocked,
    dogDuo: owns(a.dogs) && owns(b.dogs),
    dogBonus: bonus,
  }
}
