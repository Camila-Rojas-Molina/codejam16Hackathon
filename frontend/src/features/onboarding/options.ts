import { AVATAR_LIST } from '../../lib/avatars'
import type { Role } from '../../lib/types'

/** Tourist and Local are modes anyone can switch between, not account types. */
export const MODE_OPTIONS: {
  mode: Role
  emoji: string
  title: string
  blurb: string
  /** Visual identity so the active mode is obvious at a glance. */
  activeClass: string
  fill: string
}[] = [
  {
    mode: 'tourist',
    emoji: '🧳',
    title: 'Tourist',
    blurb: 'I’m visiting somewhere and want to discover it with a local.',
    // Ink on sun = 13.9:1
    activeClass: 'bg-sun text-ink',
    fill: 'var(--color-sun)',
  },
  {
    mode: 'local',
    emoji: '📍',
    title: 'Local',
    blurb: 'I’m home and want to show visitors my favourite spots.',
    // Navy on bubble = 9.4:1
    activeClass: 'bg-bubble text-navy',
    fill: 'var(--color-bubble)',
  },
]

export const modeMeta = (mode: Role) => MODE_OPTIONS.find((m) => m.mode === mode)!

/** Avatar ids, in picker order (images and alt text live in lib/avatars.ts). */
export const AVATARS = AVATAR_LIST.map((a) => a.id)

export const NAME_MAX_LENGTH = 20

export const roleLabel = (role: Role) => (role === 'tourist' ? 'Tourist 🧳' : 'Local 📍')
