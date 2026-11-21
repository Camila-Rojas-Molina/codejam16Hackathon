// Live state of every challenge for the signed-in person (progress from real data).
import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { CHALLENGES, challengeState, dailyChallenge, todayKey, type ChallengeState } from './challenges'

export function useChallenges(): { all: ChallengeState[]; daily: ChallengeState | null; readyCount: number } {
  const { profile, huntResults } = useStore()
  return useMemo(() => {
    if (!profile) return { all: [], daily: null, readyCount: 0 }
    const ctx = { profile, huntResults, today: todayKey() }
    const all = CHALLENGES.map((c) => challengeState(c, ctx))
    return {
      all,
      daily: all.find((s) => s.challenge.id === dailyChallenge().id) ?? null,
      readyCount: all.filter((s) => s.status === 'ready').length,
    }
  }, [profile, huntResults])
}
