// Shared data types (PRD section 6). Screens import types from here, never from mockData.

export type Role = 'tourist' | 'local'

export type User = {
  id: string
  name: string
  avatar: string
  role: Role
  funFact?: string
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
