import type { LatLng } from '../map/types'

export type QuestKind = 'landmark' | 'mystery' | 'dog-park' | 'accessibility'

export type Quest = {
  id: string
  kind: QuestKind
  photoUrl: string
  location: LatLng
  timeLimitMinutes: number
  // Shared after the team finds the location.
  trivia: string
  finderCount: number
}
