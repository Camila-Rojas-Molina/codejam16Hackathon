// Tunable numbers for compatibility scoring (features/profile/matching.ts). Change them here.

import type { CompanionQuality } from './types'

/** How much each dimension counts in the overall score. */
export const DIMENSION_WEIGHTS = {
  interests: 3,
  languages: 3,
  /** What you value most in an exploring buddy (ranked). */
  qualities: 3,
  pace: 2,
  budget: 2,
  energy: 1,
  planning: 1,
  group: 1,
} as const

/**
 * Influence of each ranked "great exploring buddy" quality, by position (1st, 2nd, 3rd…). Internal
 * only: people see their order, never these numbers. The first choice counts twice as much as the
 * second and more than all the others together (0.5 + 0.25 + 0.15 + 0.08 = 0.98 < 1), so it
 * dominates. Keep it that way when tuning. Positions beyond the list use the last value.
 */
export const QUALITY_RANK_WEIGHTS = [1, 0.5, 0.25, 0.15, 0.08] as const

export const rankWeight = (index: number) => QUALITY_RANK_WEIGHTS[Math.min(index, QUALITY_RANK_WEIGHTS.length - 1)]

/** How many qualities someone can rank. */
export const MAX_RANKED_QUALITIES = 5

/** Qualities we can't read from someone's answers count only when both people value them. */
export const UNINFERABLE_QUALITIES: CompanionQuality[] = ['funny', 'respectful']
