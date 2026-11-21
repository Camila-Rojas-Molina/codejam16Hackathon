// Structured, mode-aware input for compatibility scoring. Deliberately simple: each dimension is
// a 0–1 score, dimensions with missing data are skipped, and the total is a weighted average.
// A smarter matcher can replace compatibility() later without changing what we collect.
import { activeTrip } from './model'
import type {
  AccessibilityNeed,
  BudgetLevel,
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
}

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

export type Dimension = 'interests' | 'languages' | 'energy' | 'planning' | 'pace' | 'budget' | 'group'

const WEIGHTS: Record<Dimension, number> = {
  interests: 3,
  languages: 3,
  pace: 2,
  budget: 2,
  energy: 1,
  planning: 1,
  group: 1,
}

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

export type Compatibility = {
  /** 0–1, or null if there's nothing to compare yet. */
  total: number | null
  dimensions: Partial<Record<Dimension, number>>
  sharedInterests: Interest[]
  sharedLanguages: string[]
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

  return { total: weight > 0 ? sum / weight : null, dimensions: dims, sharedInterests: shared, sharedLanguages: langs }
}
