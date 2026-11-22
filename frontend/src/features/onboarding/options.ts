import type { IconAccent, IconName } from '../../components/icons/Icon'
import { AVATAR_LIST } from '../../lib/avatars'
import type { Role } from '../../lib/types'

/** Tourist and Local are modes anyone can switch between, not account types. */
export const MODE_OPTIONS: {
  mode: Role
  icon: IconName
  /** Icon accent colour for this mode. */
  accent: IconAccent
  title: string
  blurb: string
  /** Fill used when the mode is active, so the current mode is obvious at a glance. */
  activeClass: string
}[] = [
  {
    mode: 'tourist',
    icon: 'suitcase',
    accent: 'saffron',
    title: 'Tourist',
    blurb: 'I’m visiting somewhere and want to discover it with a local.',
    // Ink on saffron = 6.0:1
    activeClass: 'bg-saffron text-ink',
  },
  {
    mode: 'local',
    icon: 'pin',
    accent: 'teal',
    title: 'Local',
    blurb: 'I’m home and want to show visitors my favourite spots.',
    // Ink on teal-soft = 7.9:1
    activeClass: 'bg-teal-soft text-ink',
  },
]

export const modeMeta = (mode: Role) => MODE_OPTIONS.find((m) => m.mode === mode)!

/** Avatar ids, in picker order (images and alt text live in lib/avatars.ts). */
export const AVATARS = AVATAR_LIST.map((a) => a.id)

export const NAME_MAX_LENGTH = 20

export const roleLabel = (role: Role) => (role === 'tourist' ? 'Tourist' : 'Local')
