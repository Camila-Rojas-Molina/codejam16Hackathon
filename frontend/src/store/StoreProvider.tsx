import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { Thread } from '../features/chat/types'
import type { ProfileRecord } from '../features/profile/types'
import { todayKey } from '../features/quests/challenges'
import * as api from '../lib/api'
import { StoreContext, type StoreValue } from './context'
import { currentUser, loadState, reducer, saveState } from './state'

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const accountId = state.account?.id ?? null
  // Message threads live in api.ts (not in the persisted app state); this is the in-memory copy.
  const [threads, setThreads] = useState<{ owner: string | null; byPerson: Record<string, Thread> }>({ owner: null, byPerson: {} })

  useEffect(() => {
    saveState(state)
  }, [state])

  // Refresh the cached profile from the source of truth when the app opens.
  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    api
      .getProfile(accountId)
      .then((found) => {
        if (cancelled) return
        if (!found) return dispatch({ type: 'reset' })
        dispatch({ type: 'setAccount', account: found.account })
        dispatch({ type: 'setProfile', profile: found.profile })
      })
      .catch(() => {
        // Offline or storage blocked: keep using the cached copy.
      })
    api
      .getThreads(accountId)
      .then((byPerson) => !cancelled && setThreads({ owner: accountId, byPerson }))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [accountId])

  const value = useMemo<StoreValue>(() => {
    const requireId = () => {
      if (!accountId) throw new Error('Please create your profile first.')
      return accountId
    }
    const commit = (profile: ProfileRecord) => {
      dispatch({ type: 'setProfile', profile })
      return profile
    }
    const huntResults = [...Object.values(state.results), ...Object.values(state.parked).flatMap((s) => Object.values(s.results))]
    const myThreads = threads.owner === accountId ? threads.byPerson : {}
    const setThread = (thread: Thread) =>
      setThreads((t) => ({ owner: accountId, byPerson: { ...(t.owner === accountId ? t.byPerson : {}), [thread.person.id]: thread } }))

    return {
      ...state,
      user: currentUser(state),
      setPartner: (partner) => dispatch({ type: 'setPartner', partner }),
      clearMatch: () => dispatch({ type: 'clearMatch' }),
      completeHunt: (result) => dispatch({ type: 'completeHunt', ...result }),
      setDemoMode: (on) => dispatch({ type: 'setDemoMode', on }),
      reset: () => dispatch({ type: 'reset' }),

      createAccount: async (input) => {
        const { account, profile } = await api.createAccount(input)
        dispatch({ type: 'signIn', account, profile })
        return account
      },
      updateAccount: async (input) => {
        const account = await api.updateAccount(requireId(), input)
        dispatch({ type: 'setAccount', account })
        return account
      },
      saveUniversal: async (universal) => commit(await api.saveUniversalProfile(requireId(), universal)),
      switchMode: async (mode) => commit(await api.setActiveMode(requireId(), mode)),
      saveTrip: async (trip, opts) => commit(await api.saveTrip(requireId(), trip, opts)),
      activateTrip: async (tripId) => commit(await api.setActiveTrip(requireId(), tripId)),
      deleteTrip: async (tripId) => commit(await api.deleteTrip(requireId(), tripId)),
      saveLocal: async (local, opts) => commit(await api.saveLocalContext(requireId(), local, opts)),
      clearLocal: async () => commit(await api.clearLocalContext(requireId())),
      deleteAccount: async () => {
        await api.deleteAccount(requireId())
        dispatch({ type: 'reset' })
      },

      addCity: async (name) => commit(await api.addDiscoveredCity(requireId(), name)),
      removeCity: async (cityId) => commit(await api.removeDiscoveredCity(requireId(), cityId)),

      huntResults,
      claimChallenge: async (challengeId) =>
        commit(await api.claimChallengeReward(requireId(), challengeId, { huntResults, today: todayKey() })),
      purchase: async (itemId) => commit(await api.purchaseItem(requireId(), itemId)),
      setEquipped: async (itemId, on) => commit(await api.setEquipped(requireId(), itemId, on)),

      setLiked: async (personId, liked) => commit(await api.setLiked(requireId(), personId, liked)),
      threads: myThreads,
      sendMessage: async (person, text) => setThread(await api.sendMessage(requireId(), person, text)),
      markRead: async (personId) => {
        if ((myThreads[personId]?.messages ?? []).every((m) => m.read)) return
        const thread = await api.markThreadRead(requireId(), personId)
        if (thread) setThread(thread)
      },
    }
  }, [state, accountId, threads])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
