import type { Hunt, ScoreBreakdown } from '../../lib/types'

// Points for one completed hunt (PRD 5.8).
export const SCORING = {
  speedBonusShare: 0.5,
  metSomeoneNewBonus: 50,
} as const

export function scoreHunt(hunt: Pick<Hunt, 'basePoints' | 'timeLimitSec'>, secondsLeft: number): ScoreBreakdown {
  const base = hunt.basePoints
  const left = Math.min(hunt.timeLimitSec, Math.max(0, secondsLeft))
  const speedBonus = Math.round(((base * left) / hunt.timeLimitSec) * SCORING.speedBonusShare)
  const metSomeoneBonus = SCORING.metSomeoneNewBonus
  return { base, speedBonus, metSomeoneBonus, total: base + speedBonus + metSomeoneBonus }
}
