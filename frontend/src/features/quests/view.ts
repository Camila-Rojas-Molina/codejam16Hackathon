// What the Quests screens show for one assignment: its catalogue copy (with {city} filled in), a
// valid icon, where to go, and a single display state. The reward is always the assignment's own
// (the server's value), never the catalogue's.
import { ICONS, type IconName } from '../../components/icons/iconPaths'
import type { QuestAssignment, QuestDef } from '../economy/types'
import { INTEREST_OPTIONS } from '../profile/options'
import { fillCity, questDef } from './catalog'
import { matchedInterests, type QuestPerson } from './engine'

export type QuestDisplayState = 'active' | 'ready' | 'claimed' | 'expired' | 'replaced'

export type QuestView = {
  a: QuestAssignment
  def: QuestDef | undefined
  title: string
  description: string
  objective: string
  icon: IconName
  action: { label: string; to: string } | null
  state: QuestDisplayState
  /** 0–100 */
  pct: number
}

export const isIconName = (name: string): name is IconName => Object.hasOwn(ICONS, name)

export function questView(a: QuestAssignment, city: string | null): QuestView {
  const def = questDef(a.defId)
  const state: QuestDisplayState =
    a.status === 'completed' ? 'claimed' : a.status === 'expired' ? 'expired' : a.status === 'replaced' ? 'replaced' : a.claimable ? 'ready' : 'active'
  const target = Math.max(1, a.target)
  return {
    a,
    def,
    title: def ? fillCity(def.title, city) : 'Quest',
    description: def ? fillCity(def.description, city) : 'This quest is no longer in the catalogue.',
    objective: def ? fillCity(def.objective, city) : '',
    icon: def && isIconName(def.icon) ? def.icon : 'quest',
    action: def?.action ?? null,
    state,
    pct: state === 'claimed' ? 100 : Math.round((Math.min(a.progress, target) / target) * 100),
  }
}

/** Slot number from a period key ('d:2026-11-23:2' → 2), for a stable order. */
export const slotOf = (a: Pick<QuestAssignment, 'periodKey'>) => Number(a.periodKey.split(':')[2] ?? 0)

/** "Photography", "Food & gastronomy"… for interest ids. */
export const interestLabel = (id: string) => INTEREST_OPTIONS.find((o) => o.value === id)?.label ?? id

/** "2 days 4 h", "3 h 12 min", "12 min", "less than a minute". */
export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'resetting…'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'less than a minute'
  const days = Math.floor(min / 1440)
  const hours = Math.floor((min % 1440) / 60)
  const mins = min % 60
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} h` : ''}`
  if (hours > 0) return `${hours} h${mins ? ` ${mins} min` : ''}`
  return `${mins} min`
}

const PACE_FITS: Record<string, NonNullable<QuestDef['effort']>[]> = {
  relaxed: ['light'],
  balanced: ['moderate', 'light'],
  fast: ['big', 'moderate'],
  spontaneous: [],
}

/** Why this adventure was suggested, in plain words. */
export function whySuggested(def: QuestDef | undefined, person: Pick<QuestPerson, 'interests' | 'mode' | 'pace'>, city: string | null): string {
  if (!def) return 'Picked for you this week'
  const liked = matchedInterests(def, person).map((i) => interestLabel(i).toLowerCase())
  if (liked.length) return `Because you like ${liked.slice(0, 2).join(' and ')}`
  if (def.modes?.includes('tourist') && person.mode === 'tourist') return city ? `For your trip to ${city}` : 'For your trip'
  if (def.modes?.includes('local') && person.mode === 'local') return 'For locals who want to see home anew'
  if (def.effort && person.pace && PACE_FITS[person.pace]?.includes(def.effort)) return 'Matches your pace'
  return 'Something new to try this week'
}
