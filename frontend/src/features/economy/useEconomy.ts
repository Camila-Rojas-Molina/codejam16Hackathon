// The points economy for screens: the state plus the store's actions, with a busy flag per action
// so buttons can disable while a request is in flight (the store also ignores repeat clicks, and
// the server/device economy pays each reward once anyway).
import { useMemo } from 'react'
import { pointsBalance, pointsEarned } from '../profile/model'
import { useStore } from '../../store/useStore'
import type { EconomyState, QuestAssignment, QuestCategory } from './types'

export type EconomyView = {
  /** Null until the first load. */
  state: EconomyState | null
  /** True before the first load has finished (numbers come from the cached record meanwhile). */
  loading: boolean
  error: string | null
  balance: number
  earnedTotal: number
  spentTotal: number
  /** Active quests by category. */
  quests: Record<QuestCategory, QuestAssignment[]>
  claimableCount: number
  /** 'server' = authoritative, 'device' = kept in this browser only. */
  source: EconomyState['source'] | null
  busy: {
    claim: (assignmentId: string) => boolean
    refresh: (assignmentId: string) => boolean
    purchase: (itemId: string) => boolean
    equip: (itemId: string) => boolean
  }
  claimQuest: (assignmentId: string) => Promise<void>
  refreshDaily: (assignmentId: string) => Promise<void>
  purchase: (itemId: string) => Promise<void>
  setEquipped: (itemId: string, on: boolean) => Promise<void>
  reload: () => Promise<void>
}

export function useEconomy(): EconomyView {
  const { economy, economyError, economyPending, profile, claimQuest, refreshDaily, purchase, setEquipped, reloadEconomy } = useStore()
  return useMemo(() => {
    const quests: Record<QuestCategory, QuestAssignment[]> = { weekly: [], daily: [], adventure: [], starter: [] }
    for (const q of economy?.quests ?? []) quests[q.category].push(q)
    const pending = (key: string) => economyPending.includes(key)
    // Before the first load, the record's mirror (cached) is the best guess.
    const earned = economy?.earnedTotal ?? pointsEarned(profile?.rewards)
    const balance = economy?.balance ?? pointsBalance(profile?.rewards)
    return {
      state: economy,
      loading: !economy,
      error: economyError,
      balance,
      earnedTotal: earned,
      spentTotal: economy?.spentTotal ?? Math.max(0, earned - balance),
      quests,
      claimableCount: (economy?.quests ?? []).filter((q) => q.claimable).length,
      source: economy?.source ?? null,
      busy: {
        claim: (id) => pending(`claim:${id}`),
        refresh: (id) => pending(`refresh:${id}`),
        purchase: (id) => pending(`purchase:${id}`),
        equip: (id) => pending(`equip:${id}`),
      },
      claimQuest,
      refreshDaily,
      purchase,
      setEquipped,
      reload: reloadEconomy,
    }
  }, [economy, economyError, economyPending, profile?.rewards, claimQuest, refreshDaily, purchase, setEquipped, reloadEconomy])
}
