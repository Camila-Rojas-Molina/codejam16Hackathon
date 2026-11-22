// The signed-in person's quests, sorted into what each screen needs. Everything comes from the
// economy state (the server when signed in, else this device: lib/economy); nothing is computed
// here except grouping. Progress, rewards and "claimable" are the economy's own values.
import { useEffect, useMemo, useState } from 'react'
import type { QuestAssignment } from '../economy/types'
import { useStore } from '../../store/useStore'
import { questCity } from './engine'
import { questView, slotOf, type QuestView } from './view'

export type QuestBoard = {
  /** False until the first economy load finishes (or while signed out). */
  ready: boolean
  /** This week's challenge (active, or already claimed this week). */
  weekly: QuestView | null
  /** Today's three dailies, in slot order (active or claimed today). */
  daily: QuestView[]
  adventures: QuestView[]
  /** Starter quests still to do (in progress or ready). */
  starter: QuestView[]
  /** Starter quests already claimed. */
  starterDone: QuestView[]
  /** Completed quests, newest first. */
  history: QuestView[]
  /** Quests whose reward is ready to claim (the Quests badge). */
  readyCount: number
  dailyDoneCount: number
  /** {city} as shown in quest copy. */
  city: string | null
}

/** Re-renders every `ms` so countdowns move (a minute is plenty for "3 h 12 min"). */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

export function useChallenges(): QuestBoard {
  const { economy, profile } = useStore()
  const now = useNow(60_000)
  return useMemo(() => {
    const city = questCity(profile)
    if (!economy) {
      return { ready: false, weekly: null, daily: [], adventures: [], starter: [], starterDone: [], history: [], readyCount: 0, dailyDoneCount: 0, city }
    }
    // The current period's quests: active ones, plus ones claimed in a period that hasn't ended.
    const seen = new Set<string>()
    const current: QuestAssignment[] = []
    for (const a of [...economy.quests, ...economy.history]) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      const live = a.status === 'active' || (a.status === 'completed' && (a.expiresAt === null || Date.parse(a.expiresAt) > now))
      if (live) current.push(a)
    }
    const view = (a: QuestAssignment) => questView(a, city)
    const of = (category: QuestAssignment['category']) => current.filter((a) => a.category === category).sort((x, y) => slotOf(x) - slotOf(y)).map(view)
    const daily = of('daily').slice(0, 3)
    const starterAll = of('starter')
    return {
      ready: true,
      weekly: of('weekly')[0] ?? null,
      daily,
      adventures: of('adventure').slice(0, 3),
      starter: starterAll.filter((v) => v.state !== 'claimed'),
      starterDone: starterAll.filter((v) => v.state === 'claimed'),
      history: economy.history.map(view),
      readyCount: economy.quests.filter((a) => a.status === 'active' && a.claimable).length,
      dailyDoneCount: daily.filter((v) => v.state === 'claimed').length,
      city,
    }
  }, [economy, profile, now])
}
