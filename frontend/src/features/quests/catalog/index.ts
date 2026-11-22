// The quest catalogue: every quest definition, in one list. Plain data (no React), so
// `npm run gen:economy` can turn it into SQL seed data for the server.
// Ids are saved in accounts: never rename or delete one. Set `retired: true` to stop offering it.
import { REWARD_BANDS, type QuestCategory, type QuestDef } from '../../economy/types'
import { ADVENTURES } from './adventures'
import { DAILY } from './daily'
import { STARTER } from './starter'
import { WEEKLY } from './weekly'

export const QUEST_DEFS: QuestDef[] = [...WEEKLY, ...DAILY, ...ADVENTURES, ...STARTER]

const BY_ID = new Map(QUEST_DEFS.map((d) => [d.id, d]))

export const questDef = (id: string): QuestDef | undefined => BY_ID.get(id)

export const questDefsIn = (category: QuestCategory, { includeRetired = false } = {}) =>
  QUEST_DEFS.filter((d) => d.category === category && (includeRetired || !d.retired))

/** The number to reach (what progress bars count to). */
export function conditionTarget(def: Pick<QuestDef, 'condition'>): number {
  const c = def.condition
  switch (c.type) {
    case 'photos':
      return Math.max(c.count, c.distinctCities ?? 0)
    case 'hunts':
    case 'new_cities':
    case 'quests_completed':
    case 'purchases':
    case 'equipped':
      return c.count
    case 'profile':
    case 'visit':
      return 1
  }
}

/** Fills `{city}` in a title or description ("your city" when there isn't one). */
export function fillCity(text: string, city: string | null | undefined): string {
  return text.replaceAll('{city}', city?.trim() || 'your city')
}

/** Problems with the catalogue (unique ids, rewards inside their band). Empty = all good. */
export function catalogProblems(defs: QuestDef[] = QUEST_DEFS): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const d of defs) {
    if (seen.has(d.id)) problems.push(`Duplicate quest id: ${d.id}`)
    seen.add(d.id)
    const [lo, hi] = REWARD_BANDS[d.category]
    if (d.reward < lo || d.reward > hi) problems.push(`${d.id}: reward ${d.reward} is outside the ${d.category} band ${lo}–${hi}`)
    if (!d.objective) problems.push(`${d.id}: missing objective`)
    if (conditionTarget(d) < 1) problems.push(`${d.id}: target must be at least 1`)
  }
  return problems
}

export { ADVENTURES, DAILY, STARTER, WEEKLY }
