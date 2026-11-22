// The real economy: every call goes to the Supabase rpc functions in
// backend/supabase/migrations/011_economy.sql, which check eligibility, use the server's own copy
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

// Once per browser session (survives reloads in this tab) per profile: the server rate-limits changes.
const TZ_KEY = 'migo:tz-sent:v1'
function timezoneTried(profileId: string, tz: string): boolean {
  try {
    const sent = JSON.parse(sessionStorage.getItem(TZ_KEY) ?? '{}') as Record<string, string>
    if (sent[profileId] === tz) return true
    sessionStorage.setItem(TZ_KEY, JSON.stringify({ ...sent, [profileId]: tz }))
    return false
  } catch {
    return false
  }
}

function toState(raw: unknown): EconomyState {
  const state = normalizeEconomyState(raw, 'server')
  if (!state) throw new Error('The points server sent something unexpected. Try again in a moment.')
  return state
}

/** EconomyApi for one signed-in account (`profileId` = the account id). */
export function serverEconomy(profileId: string): EconomyApi {
  const api: EconomyApi = {
    async load() {
      const state = toState(await backend.economyState(profileId))
      // Days and weeks are computed in the saved timezone: update it when this browser's differs
      // (once per session), then read again so periods and resets match.
      const tz = browserTimezone()
      if (state.timezone === tz || timezoneTried(profileId, tz)) return state
      try {
        await api.setTimezone(tz)
      } catch {
        // Rate-limited or offline: the server keeps the timezone it already has.
        return state
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
