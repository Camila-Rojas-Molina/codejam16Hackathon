// Points, quests and the shop: which implementation of the EconomyApi the app uses.
//   * server (./server.ts): Supabase is configured AND someone is signed in. Authoritative.
//   * device (./device.ts): otherwise (no backend, development, offline demo). Same rules, kept in
//     this browser's localStorage. NOT tamper-proof: anyone can edit their own localStorage.
// Screens never call this directly: the store (store/StoreProvider.tsx) does, and exposes the
// state and actions (economy, claimQuest, refreshDaily, purchase, setEquipped, recordVisit).
import type { EconomyApi, EconomyState, ShopSlot } from '../../features/economy/types'
import type { PointsEntry, Rewards } from '../../features/profile/types'
import { isBackendConfigured } from '../backend'
import { deviceEconomy, type DeviceFacts } from './device'
import { serverEconomy } from './server'

export type EconomyPage = Parameters<EconomyApi['recordVisit']>[0]
export const ECONOMY_PAGES: readonly EconomyPage[] = ['map', 'shop', 'gallery', 'chat', 'quests']

export type { DeviceFacts }
export { browserTimezone } from './server'
export { forgetDeviceEconomy } from './device'

/**
 * The economy for one account. `signedIn` = there is a Supabase login on this device.
 * `facts` (a ref, read at call time) feeds the device economy what it needs to measure quest progress (ignored on the server,
 * which reads its own stored data).
 */
export function economyFor(accountId: string, opts: { signedIn: boolean; facts: { readonly current: DeviceFacts } }): EconomyApi {
  const { facts } = opts
  return isBackendConfigured() && opts.signedIn ? serverEconomy(accountId) : deviceEconomy(accountId, () => facts.current)
}

/** Which implementation economyFor() would pick (shown in Settings / dev notes). */
export const economySource = (signedIn: boolean): EconomyState['source'] => (isBackendConfigured() && signedIn ? 'server' : 'device')

// ---- The read-only mirror in profile.rewards ---------------------------------------------------

/**
 * `profile.rewards` rebuilt from the economy state, so code that still reads the record (avatar
 * accessories, pointsBalance(), pointsEarned()) shows the real numbers. `recent` holds only the
 * newest ~50 entries, so older history is folded into two summary rows that keep the balance and
 * the earned total exact. Never saved: the economy is the source of truth.
 */
export function mirrorRewards(state: EconomyState): Rewards {
  const recent = [...state.recent].reverse()
  const earnedShown = recent.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0)
  const spentShown = recent.filter((e) => e.amount < 0).reduce((n, e) => n - e.amount, 0)
  const older: PointsEntry[] = []
  const earnedOlder = state.earnedTotal - earnedShown
  const spentOlder = state.spentTotal - spentShown
  if (earnedOlder > 0) older.push({ id: 'mirror-earned', amount: earnedOlder, reason: 'challenge', refId: 'mirror:earned', label: 'Earlier points', at: 0 })
  if (spentOlder > 0) older.push({ id: 'mirror-spent', amount: -spentOlder, reason: 'purchase', refId: 'mirror:spent', label: 'Earlier purchases', at: 0 })
  const ledger: PointsEntry[] = recent.map((e) => ({
    id: e.id,
    amount: e.amount,
    reason: e.kind === 'purchase' || e.amount < 0 ? 'purchase' : 'challenge',
    refId: e.ref,
    label: e.label,
    at: Date.parse(e.at) || 0,
  }))
  // Anything the totals don't explain (e.g. adjustments) so the sum always equals the balance.
  const sum = [...older, ...ledger].reduce((n, e) => n + e.amount, 0)
  if (sum !== state.balance)
    older.push({ id: 'mirror-adjust', amount: state.balance - sum, reason: state.balance - sum < 0 ? 'purchase' : 'challenge', refId: 'mirror:adjust', label: 'Adjustment', at: 0 })
  return { ledger: [...older, ...ledger], owned: [...state.owned], equipped: { ...state.equipped } as Partial<Record<ShopSlot, string>> }
}
