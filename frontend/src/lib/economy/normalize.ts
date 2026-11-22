// Turns whatever the server (or an older cached copy) sent into a well-formed EconomyState, so a
// missing field or a new enum value never crashes a screen. Unknown values are dropped, not guessed.
import type {
  EconomyState,
  LedgerEntry,
  LedgerKind,
  QuestAssignment,
  QuestCategory,
  QuestStatus,
  ShopSlot,
} from '../../features/economy/types'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null)

const LEDGER_KINDS: readonly LedgerKind[] = ['quest', 'purchase', 'legacy', 'adjustment']
const CATEGORIES: readonly QuestCategory[] = ['weekly', 'daily', 'adventure', 'starter']
const STATUSES: readonly QuestStatus[] = ['active', 'completed', 'expired', 'replaced']
export const SHOP_SLOTS_ALL: readonly ShopSlot[] = ['head', 'hair', 'face', 'ears', 'neck', 'back', 'hand', 'backdrop']

function ledgerEntry(v: unknown): LedgerEntry | null {
  if (!isObj(v) || typeof v.amount !== 'number' || typeof v.ref !== 'string') return null
  const kind = LEDGER_KINDS.includes(v.kind as LedgerKind) ? (v.kind as LedgerKind) : 'adjustment'
  return { id: str(v.id, v.ref), amount: v.amount, kind, ref: v.ref, label: str(v.label), at: str(v.at) }
}

function assignment(v: unknown): QuestAssignment | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.defId !== 'string') return null
  if (!CATEGORIES.includes(v.category as QuestCategory)) return null
  const status = STATUSES.includes(v.status as QuestStatus) ? (v.status as QuestStatus) : 'active'
  const target = Math.max(1, num(v.target, 1))
  const progress = Math.max(0, num(v.progress))
  return {
    id: v.id,
    defId: v.defId,
    category: v.category as QuestCategory,
    periodKey: str(v.periodKey),
    status,
    progress,
    target,
    claimable: v.claimable === true && status === 'active',
    assignedAt: str(v.assignedAt),
    expiresAt: strOrNull(v.expiresAt),
    completedAt: strOrNull(v.completedAt),
    reward: Math.max(0, num(v.reward)),
  }
}

function equipped(v: unknown): EconomyState['equipped'] {
  const out: EconomyState['equipped'] = {}
  if (!isObj(v)) return out
  for (const slot of SHOP_SLOTS_ALL) if (typeof v[slot] === 'string') out[slot] = v[slot] as string
  return out
}

const list = <T>(v: unknown, map: (x: unknown) => T | null): T[] =>
  (Array.isArray(v) ? v : []).map(map).filter((x): x is T => x !== null)

/** Null when the value isn't an economy state at all. */
export function normalizeEconomyState(v: unknown, source: EconomyState['source']): EconomyState | null {
  if (!isObj(v) || typeof v.balance !== 'number') return null
  return {
    balance: num(v.balance),
    earnedTotal: num(v.earnedTotal),
    spentTotal: num(v.spentTotal),
    recent: list(v.recent, ledgerEntry),
    owned: [...new Set(list(v.owned, (x) => (typeof x === 'string' ? x : null)))],
    equipped: equipped(v.equipped),
    quests: list(v.quests, assignment),
    history: list(v.history, assignment),
    dailyRefreshAvailable: v.dailyRefreshAvailable === true,
    nextDailyReset: str(v.nextDailyReset),
    nextWeeklyReset: str(v.nextWeeklyReset),
    timezone: str(v.timezone, 'UTC'),
    source,
  }
}
