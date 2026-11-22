// Challenges (the QUESTS tab): objectives with progress, a points reward and a completion state.
// Each challenge's progress is computed from real data. Nothing is self-reported.
//
// Kept deliberately small for now. To add one: give it a stable id, a cadence and a progress()
// function over ChallengeContext. Rewards can be claimed once per period (see periodKey()).
import type { IconName } from '../../components/icons/Icon'
import { hasUniversalProfile } from '../profile/flow'
import { isModeReady } from '../profile/model'
import type { ProfileRecord } from '../profile/types'
import type { HuntResult } from '../../lib/types'

export type Cadence = 'daily' | 'weekly' | 'seasonal' | 'special' | 'starter'

export const CADENCE_LABELS: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  seasonal: 'Seasonal',
  special: 'Special',
  starter: 'Getting started',
}

/** Everything a challenge may look at. */
export type ChallengeContext = {
  profile: ProfileRecord
  /** Completed photo hunts across every exploring context. */
  huntResults: HuntResult[]
  /** yyyy-mm-dd, local time. */
  today: string
}

export type Challenge = {
  id: string
  cadence: Cadence
  icon: IconName
  title: string
  description: string
  /** "Complete 1 photo hunt" */
  objective: string
  target: number
  reward: number
  progress: (ctx: ChallengeContext) => number
  /** Where to go to make progress. */
  action: { label: string; to: string }
}

const localDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const todayKey = (now = Date.now()) => localDay(now)

export const CHALLENGES: Challenge[] = [
  {
    id: 'daily-hunt',
    cadence: 'daily',
    icon: 'camera',
    title: 'Hunt of the day',
    description: 'Team up with someone new and find a mystery spot together.',
    objective: 'Complete a photo hunt today',
    target: 1,
    reward: 50,
    progress: ({ huntResults, today }) => huntResults.filter((r) => localDay(r.completedAt) === today).length,
    action: { label: 'Go hunting', to: '/hunts' },
  },
  {
    id: 'starter-profile',
    cadence: 'starter',
    icon: 'id',
    title: 'Hello, explorer',
    description: 'Tell MIGO who you are and how you like to explore.',
    objective: 'Complete your profile questionnaire',
    target: 1,
    reward: 50,
    progress: ({ profile }) => (hasUniversalProfile(profile) && profile.universal?.homeCity.trim() ? 1 : 0),
    action: { label: 'Review my answers', to: '/profile?tab=answers' },
  },
  {
    id: 'starter-two-modes',
    cadence: 'starter',
    icon: 'shuffle',
    title: 'Two ways to explore',
    description: 'Plan a trip as a tourist and set up your city as a local.',
    objective: 'Set up Tourist mode and Local mode',
    target: 2,
    reward: 100,
    progress: ({ profile }) => Number(isModeReady(profile, 'tourist')) + Number(isModeReady(profile, 'local')),
    action: { label: 'Set up modes', to: '/mode' },
  },
  {
    id: 'starter-passport',
    cadence: 'starter',
    icon: 'stamp',
    title: 'Passport stamps',
    description: 'Show off where you’ve been. It helps matches find common ground.',
    objective: 'Add 3 cities you’ve discovered',
    target: 3,
    reward: 50,
    progress: ({ profile }) => profile.universal?.citiesDiscovered.length ?? 0,
    action: { label: 'Add cities', to: '/profile#cities' },
  },
]

export const challenge = (id: string) => CHALLENGES.find((c) => c.id === id)

/** Which period a reward belongs to: daily challenges reset each day, starters pay once. */
export function periodKey(c: Pick<Challenge, 'cadence'>, today: string): string {
  if (c.cadence === 'daily') return today
  if (c.cadence === 'weekly') {
    const d = new Date(`${today}T12:00:00`)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return `week-of-${localDay(monday.getTime())}`
  }
  return 'once'
}

export const rewardRef = (c: Challenge, today: string) => `challenge:${c.id}:${periodKey(c, today)}`

export type ChallengeStatus = 'in-progress' | 'ready' | 'claimed'

export type ChallengeState = {
  challenge: Challenge
  progress: number
  status: ChallengeStatus
}

export function challengeState(c: Challenge, ctx: ChallengeContext): ChallengeState {
  const progress = Math.min(c.target, Math.max(0, c.progress(ctx)))
  const claimed = ctx.profile.rewards.ledger.some((e) => e.refId === rewardRef(c, ctx.today))
  return { challenge: c, progress, status: claimed ? 'claimed' : progress >= c.target ? 'ready' : 'in-progress' }
}

/** Today's daily challenge (one for now; rotate here when there are more). */
export const dailyChallenge = () => CHALLENGES.find((c) => c.cadence === 'daily')!
