import { startTransition, useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { Connection, Thread } from '../features/chat/types'
import type { ProfileRecord } from '../features/profile/types'
import { todayKey } from '../features/quests/challenges'
import * as api from '../lib/api'
import * as auth from '../lib/auth'
import { STORAGE_KEY as CONNECTIONS_KEY } from '../lib/connectionsDb'
import { StoreContext, type StoreValue } from './context'
import { currentUser, loadState, reducer, saveState } from './state'

// Fixed for the life of the page (config is read once at startup).
const AUTH_ENABLED = auth.authEnabled()

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const accountId = state.account?.id ?? null
  // Message threads live in api.ts (not in the persisted app state); this is the in-memory copy.
  const [threads, setThreads] = useState<{ owner: string | null; byPerson: Record<string, Thread> }>({ owner: null, byPerson: {} })
  // Connection requests and connections (api.ts). Kept with the account they belong to.
  const [connections, setConnections] = useState<{ owner: string | null; list: Connection[] | null }>({ owner: null, list: null })
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

  // Load connections, then keep them fresh: when the app regains focus, every 30 s while it's open
  // (a local's answer or a new request arrives from someone else), and when another tab changes them.
  const loadConnections = useCallback(async () => {
    if (!accountId) return
    const list = await api.getConnections(accountId)
    setConnections({ owner: accountId, list })
  }, [accountId])

  useEffect(() => {
    if (!accountId) return
    const refresh = () => void loadConnections().catch(() => {})
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    const onStorage = (e: StorageEvent) => (e.key === CONNECTIONS_KEY || e.key === null) && refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', onStorage)
    const timer = window.setInterval(() => document.visibilityState === 'visible' && refresh(), 30_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(timer)
    }
  }, [accountId, loadConnections])

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
    const myConnections = connections.owner === accountId ? connections.list : null
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
      // Clears the cached account and the login in the same render (the server logout finishes in
      // the background), so page guards never see a half-signed-out state and bounce around.
      signOut: async () => {
        dispatch({ type: 'reset' })
        await auth.signOut()
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
      deleteAccount: async (then) => {
        await api.deleteAccount(requireId())
        // One transition with the caller's navigation (`then`), so guards never see a
        // signed-out page and bounce to /login first.
        startTransition(() => {
          then?.()
          dispatch({ type: 'reset' })
          if (AUTH_ENABLED) void auth.signOut()
        })
      },

      addCity: async (place) => commit(await api.addDiscoveredCity(requireId(), place)),
      removeCity: async (cityId) => commit(await api.removeDiscoveredCity(requireId(), cityId)),

      huntResults,
      claimChallenge: async (challengeId) =>
        commit(await api.claimChallengeReward(requireId(), challengeId, { huntResults, today: todayKey() })),
      purchase: async (itemId) => commit(await api.purchaseItem(requireId(), itemId)),
      setEquipped: async (itemId, on) => commit(await api.setEquipped(requireId(), itemId, on)),

      connections: myConnections,
      refreshConnections: loadConnections,
      requestConnection: async (person) => {
        const c = await api.requestConnection(requireId(), person)
        await loadConnections()
        return c
      },
      respondToConnection: async (id, accept) => {
        const c = await api.respondToConnection(requireId(), id, accept)
        await loadConnections()
        return c
      },
      cancelConnection: async (id) => {
        const c = await api.cancelConnection(requireId(), id)
        await loadConnections()
        return c
      },
      markConnectionsSeen: async (ids) => {
        await api.markConnectionsSeen(requireId(), ids)
        await loadConnections()
      },
      removeFromMessages: async (personId) => {
        const live = myConnections?.find((c) => c.person.id === personId && c.status === 'accepted')
        commit(await api.removeFromMessages(requireId(), personId, live?.id))
        await loadConnections()
      },
      setTutorial: async (status) => commit(await api.setTutorialStatus(requireId(), status)),
      threads: myThreads,
      sendMessage: async (person, text) => setThread(await api.sendMessage(requireId(), person, text)),
      markRead: async (personId) => {
        if ((myThreads[personId]?.messages ?? []).every((m) => m.read)) return
        const thread = await api.markThreadRead(requireId(), personId)
        if (thread) setThread(thread)
      },
    }
  }, [state, accountId, threads, session, connections, loadConnections])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
