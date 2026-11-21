import type { TeamMember } from '../teams/types'

export type DogMatch = {
  id: string
  local: TeamMember
  tourist: TeamMember
  targetParkName: string
  bonusPoints: number
}
