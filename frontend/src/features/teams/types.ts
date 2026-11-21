export type MemberRole = 'local' | 'tourist'

export type TeamMember = {
  id: string
  name: string
  role: MemberRole
}

export type Team = {
  id: string
  name: string
  members: TeamMember[]
  score: number
}
