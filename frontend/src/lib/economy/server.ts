// The real economy: every call goes to the Supabase rpc functions in
// backend/supabase/migrations/007_economy.sql, which check eligibility, use the server's own copy
// of rewards and prices, and return the fresh state. Nothing here computes points.
import type { EconomyApi, EconomyState, ShopSlot } from '../../features/economy/types'
import * as backend from '../backend'
import { normalizeEconomyState } from './normalize'

/** The browser's IANA timezone, e.g. "America/Toronto" (UTC when the browser won't say). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Profiles whose timezone has been sent during this page session (the server rate-limits changes).
const timezoneSent = new Set<string>()

function toState(raw: unknown): EconomyState {
  const state = normalizeEconomyState(raw, 'server')
  if (!state) throw new Error('The points server sent something unexpected. Try again in a moment.')
  return state
}

/** EconomyApi for one signed-in account (`profileId` = the account id). */
export function serverEconomy(profileId: string): EconomyApi {
  const api: EconomyApi = {
    async load() {
      // Once per session, before the first read: days and weeks are computed in this timezone.
      if (!timezoneSent.has(profileId)) {
        timezoneSent.add(profileId)
        await api.setTimezone(browserTimezone()).catch(() => {
          // Rate-limited or offline: the server keeps the timezone it already has.
        })
      }
      return toState(await backend.economyState(profileId))
    },
    claim: async (assignmentId) => toState(await backend.economyClaim(profileId, assignmentId)),
    refreshDaily: async (assignmentId) => toState(await backend.economyRefreshDaily(profileId, assignmentId)),
    purchase: async (itemId) => toState(await backend.economyPurchase(profileId, itemId)),
    equip: async (slot: ShopSlot, itemId) => toState(await backend.economyEquip(profileId, slot, itemId)),
    recordVisit: (page) => backend.economyRecordVisit(profileId, page),
    setTimezone: (tz) => backend.economySetTimezone(profileId, tz),
  }
  return api
}
