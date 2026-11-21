// Shared data types (PRD section 6). Screens import types from here, never from mockData.
import type { DogDetails, DogStance, Interest } from '../features/profile/types'

export type Role = 'tourist' | 'local'

export type User = {
  id: string
  name: string
  avatar: string
  /** The mode this person is in for this match (contextual, not a permanent account type). */
  role: Role
  funFact?: string
  /** Public profile bits used to rank partners. Values are Interest ids from features/profile. */
  interests?: Interest[]
  languages?: string[]
  /** Public dog answer. `dog` only when stance is 'has-dog'. */
  dogs?: { stance: DogStance; dog?: DogDetails }
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Hunt = {
  id: string
  title: string
  /** /assets/hunts/<id>.jpg */
  photo: string
  lat: number
  lng: number
  timeLimitSec: number
  basePoints: number
  difficulty: Difficulty
  /** Shown after it's found. */
  revealText: string
  /** Fine to bring a (leashed) dog. Undefined = unknown (the Supabase hunts table has no column for it yet). */
  dogFriendly?: boolean
}

export type Team = {
  id: string
  name: string
  members: [User, User]
  points: number
  completedHuntIds: string[]
}

export type LatLng = { lat: number; lng: number }

export type ScoreBreakdown = {
  base: number
  speedBonus: number
  metSomeoneBonus: number
  total: number
}

export type HuntResult = {
  huntId: string
  score: ScoreBreakdown
  secondsLeft: number
  completedAt: number
  /** Object URL or data URL. Kept in memory only; not persisted across reloads. */
  selfieUrl?: string
}
