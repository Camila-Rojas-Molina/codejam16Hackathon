import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { Thread } from '../features/chat/types'
import type { ProfileRecord } from '../features/profile/types'
import { todayKey } from '../features/quests/challenges'
import * as api from '../lib/api'
import * as auth from '../lib/auth'
import { StoreContext, type StoreValue } from './context'
import { currentUser, loadState, reducer, saveState } from './state'

// Fixed for the life of the page (config is read once at startup).
const AUTH_ENABLED = auth.authEnabled()

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const accountId = state.account?.id ?? null
  // Message threads live in api.ts (not in the persisted app state); this is the in-memory copy.
  const [threads, setThreads] = useState<{ owner: string | null; byPerson: Record<string, Thread> }>({ owner: null, byPerson: {} })
  // The login (only when AUTH_ENABLED). Updated when a token refresh fails or another tab logs in/out.
  const [session, setSession] = useState<auth.Session | null>(() => (AUTH_ENABLED ? auth.getSession() : null))
  const sessionUserId = session?.user.id ?? null

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!AUTH_ENABLED) return
    return auth.onSessionChange(setSession)
  }, [])

  // Refresh the cached profile from the source of truth when the app opens (and on login changes).
  useEffect(() => {
    let cancelled = false
    if (AUTH_ENABLED) {
      // Logged out (or a cached pre-login account): that account can't be used without its login.
      if (!sessionUserId) {
        if (accountId) dispatch({ type: 'reset' })
        return
      }
      api
        .getMyProfile()
        .then((found) => {
          if (cancelled) return
          if (!found) {
            // This login has no profile: drop whatever another person left cached here.
            if (accountId) dispatch({ type: 'reset' })
            return
          }
          if (found.account.id !== accountId) return dispatch({ type: 'signIn', account: found.account, profile: found.profile })
          dispatch({ type: 'setAccount', account: found.account })
          dispatch({ type: 'setProfile', profile: found.profile })
        })
        .catch(() => {
          // Offline: keep using the cached copy.
        })
    } else if (accountId) {
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
    }
    return () => {
      cancelled = true
    }
  }, [accountId, sessionUserId])

  useEffect(() => {
    if (!accountId) return
    let cancelled = false
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
      reset: () => {
        dispatch({ type: 'reset' })
        // Otherwise the login would just load the same account again.
        if (AUTH_ENABLED) void auth.signOut()
      },

      authEnabled: AUTH_ENABLED,
      session: session ? { email: session.user.email } : null,
      signUp: async (email, password) => {
        const { session: created, needsConfirmation } = await auth.signUp(email, password)
        // A brand-new login: forget any account cached from a previous person so onboarding
        // creates a fresh one (createAccount links it to this login via the token).
        if (created) dispatch({ type: 'reset' })
        return { needsConfirmation }
      },
      signIn: async (email, password) => {
        await auth.signIn(email, password)
        let found: Awaited<ReturnType<typeof api.getMyProfile>>
        try {
          found = await api.getMyProfile()
        } catch (err) {
          // Logged in but couldn't load the profile: don't leave a half-signed-in state.
          await auth.signOut()
          throw err
        }
        if (found) dispatch({ type: 'signIn', account: found.account, profile: found.profile })
        else dispatch({ type: 'reset' })
        return { hasProfile: Boolean(found) }
      },
      signOut: async () => {
        await auth.signOut()
        dispatch({ type: 'reset' })
      },

      createAccount: async (input) => {
        if (AUTH_ENABLED && !auth.getSession()) throw new Error('Please log in first.')
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
        if (AUTH_ENABLED) await auth.signOut()
      },

      addCity: async (place) => commit(await api.addDiscoveredCity(requireId(), place)),
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
  }, [state, accountId, threads, session])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
