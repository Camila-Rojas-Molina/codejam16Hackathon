import type { Role } from '../../lib/types'

export const ROLE_OPTIONS: { role: Role; emoji: string; title: string; blurb: string }[] = [
  { role: 'tourist', emoji: '🧳', title: 'Tourist', blurb: "I'm visiting and want the real city." },
  { role: 'local', emoji: '📍', title: 'Local', blurb: 'I live here and love showing it off.' },
]

export const AVATARS = ['🦊', '🐸', '🐼', '🦉', '🐝', '🐢', '🦝', '🐧'] as const

export const NAME_MAX_LENGTH = 20

export const roleLabel = (role: Role) => (role === 'tourist' ? 'Tourist 🧳' : 'Local 📍')
