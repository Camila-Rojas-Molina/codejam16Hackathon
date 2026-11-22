import { startTransition, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Connection, Thread } from '../features/chat/types'
import type { EconomyApi, EconomyState } from '../features/economy/types'
import type { ProfileRecord } from '../features/profile/types'
import { shopItem } from '../features/rewards/shop'
import * as api from '../lib/api'
import * as auth from '../lib/auth'
import { STORAGE_KEY as CONNECTIONS_KEY } from '../lib/connectionsDb'
import { economyFor, forgetDeviceEconomy, mirrorRewards, type DeviceFacts, type EconomyPage } from '../lib/economy'
import { readJSON, writeJSON } from '../lib/storage'
import { StoreContext, type StoreValue } from './context'
import { currentUser, loadState, reducer, saveState } from './state'

// Fixed for the life of the page (config is read once at startup).
const AUTH_ENABLED = auth.authEnabled()

// Pages already reported to the economy today, per account ("visit" quests). Daily quests can ask
// for a visit, so it's once per page per account per local day; the server dedupes anyway.
const VISITS_KEY = 'migo:visits:v1'
const localDay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function visitedToday(accountId: string, page: EconomyPage): boolean {
  const saved = readJSON<Record<string, Record<string, string>>>(VISITS_KEY)
  return saved?.[accountId]?.[page] === localDay()
}
function markVisited(accountId: string, page: EconomyPage) {
  const saved = readJSON<Record<string, Record<string, string>>>(VISITS_KEY) ?? {}
  writeJSON(VISITS_KEY, { ...saved, [accountId]: { ...(saved[accountId] ?? {}), [page]: localDay() } })
}

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong. Try again.')

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

  // ---- Economy (points, quests, shop) ----------------------------------------------------------
  const [economyError, setEconomyError] = useState<string | null>(null)
  const [pending, setPending] = useState<readonly string[]>([])
  const inFlight = useRef(new Map<string, Promise<void>>())
  // The device economy measures quest progress from the profile and hunts: give it the latest.
  const factsRef = useRef<DeviceFacts>({ profile: state.profile, account: state.account, huntResults: [] })
  const huntResults = useMemo(
    () => [...Object.values(state.results), ...Object.values(state.parked).flatMap((s) => Object.values(s.results))],
    [state.results, state.parked],
  )
  useEffect(() => {
    factsRef.current = { profile: state.profile, account: state.account, huntResults }
  }, [state.profile, state.account, huntResults])

  const signedIn = Boolean(sessionUserId)
  // Built where it's used (effects and handlers), so the device economy reads the latest facts.
  const getEconomy = useCallback((): EconomyApi | null => {
    if (!accountId) return null
    // With Supabase on, the account is only usable with its login (see the profile effect above).
    if (AUTH_ENABLED && !signedIn) return null
    return economyFor(accountId, { signedIn, facts: factsRef })
  }, [accountId, signedIn])

  // Every economy request takes a number when it starts; an answer older than the one already shown
  // is dropped, so a slow reload can't bring back a reward that was just claimed.
  const seq = useRef({ next: 0, shown: 0 })
  const applyEconomy = useCallback(
    (ticket: number, next: EconomyState) => {
      if (!accountId || ticket < seq.current.shown) return
      seq.current.shown = ticket
      dispatch({ type: 'setEconomy', accountId, economy: next })
      setEconomyError(null)
    },
    [accountId],
  )

  const reloadEconomy = useCallback(async () => {
    const economyApi = getEconomy()
    if (!economyApi) return
    const t = ++seq.current.next
    try {
      applyEconomy(t, await economyApi.load())
    } catch (err) {
      setEconomyError(errorText(err))
    }
  }, [getEconomy, applyEconomy])

  // Load after sign-in / app open, and again when something that can move a quest on changes
  // (profile saved, a hunt finished). Also when the tab comes back, and right after the daily reset.
  const progressKey = `${state.profile?.updatedAt ?? 0}:${huntResults.length}:${state.account?.avatar ?? ''}`
  useEffect(() => {
    const economyApi = getEconomy()
    if (!economyApi) return
    const t = ++seq.current.next
    economyApi.load().then(
      (next) => applyEconomy(t, next),
      (err: unknown) => setEconomyError(errorText(err)),
    )
  }, [getEconomy, applyEconomy, progressKey])

  useEffect(() => {
    const economyApi = getEconomy()
    if (!economyApi) return
    const onVisible = () => document.visibilityState === 'visible' && void reloadEconomy()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [getEconomy, reloadEconomy])

  const nextReset = state.economy?.nextDailyReset
  useEffect(() => {
    const at = nextReset ? Date.parse(nextReset) : NaN
    if (!getEconomy() || !Number.isFinite(at)) return
    // A second late, so the new day has started on the server too. Capped so timers stay sane.
    const wait = Math.min(Math.max(at - Date.now() + 1000, 1000), 24 * 3600_000)
    const timer = window.setTimeout(() => void reloadEconomy(), wait)
    return () => window.clearTimeout(timer)
  }, [getEconomy, nextReset, reloadEconomy])

  /** Runs one economy write. The same key while it's in flight returns the same promise (double clicks). */
  const runEconomy = useCallback(
    (key: string, write: (economy: EconomyApi) => Promise<EconomyState>): Promise<void> => {
      const running = inFlight.current.get(key)
      if (running) return running
      const economyApi = getEconomy()
      if (!economyApi) return Promise.reject(new Error(accountId ? 'Please log in again.' : 'Please create your profile first.'))
      setPending((p) => [...p, key])
      const t = ++seq.current.next
      const job = (async () => {
        try {
          applyEconomy(t, await write(economyApi))
        } catch (err) {
          const message = errorText(err)
          setEconomyError(message)
          throw err instanceof Error ? err : new Error(message)
        } finally {
          inFlight.current.delete(key)
          setPending((p) => p.filter((k) => k !== key))
        }
      })()
      inFlight.current.set(key, job)
      return job
    },
    [getEconomy, accountId, applyEconomy],
  )

  const recordVisit = useCallback(
    (page: EconomyPage) => {
      const economyApi = getEconomy()
      if (!economyApi || !accountId || visitedToday(accountId, page)) return
      const key = `visit:${page}`
      if (inFlight.current.has(key)) return
      const job = (async () => {
        try {
          await economyApi.recordVisit(page)
          markVisited(accountId, page)
          // A visit can finish a quest: show it as claimable.
          const t = ++seq.current.next
          applyEconomy(t, await economyApi.load())
        } catch {
          // Not worth bothering anyone: it's retried on the next visit.
        } finally {
          inFlight.current.delete(key)
        }
      })()
      inFlight.current.set(key, job)
    },
    [getEconomy, accountId, applyEconomy],
  )

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
    const myThreads = threads.owner === accountId ? threads.byPerson : {}
    const myConnections = connections.owner === accountId ? connections.list : null
    const setThread = (thread: Thread) =>
      setThreads((t) => ({ owner: accountId, byPerson: { ...(t.owner === accountId ? t.byPerson : {}), [thread.person.id]: thread } }))

    // profile.rewards mirrors the economy (read-only), so older readers see the real balance/outfit.
    const profile = state.profile && state.economy ? { ...state.profile, rewards: mirrorRewards(state.economy) } : state.profile

    return {
      ...state,
      profile,
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
        const id = requireId()
        await api.deleteAccount(id)
        forgetDeviceEconomy(id)
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
      economy: state.economy,
      economyError,
      economyPending: pending,
      reloadEconomy,
      claimQuest: (assignmentId) => runEconomy(`claim:${assignmentId}`, (e) => e.claim(assignmentId)),
      refreshDaily: (assignmentId) => runEconomy(`refresh:${assignmentId}`, (e) => e.refreshDaily(assignmentId)),
      // No auto-equip: buying and wearing are separate choices.
      purchase: (itemId) => runEconomy(`purchase:${itemId}`, (e) => e.purchase(itemId)),
      setEquipped: (itemId, on) => {
        const item = shopItem(itemId)
        if (!item) return Promise.reject(new Error('That item isn’t in the shop.'))
        const equipped = state.economy?.equipped ?? state.profile?.rewards.equipped ?? {}
        // Taking off something that isn't on: nothing to do.
        if (!on && equipped[item.slot] !== item.id) return Promise.resolve()
        return runEconomy(`equip:${item.id}`, (e) => e.equip(item.slot, on ? item.id : null))
      },
      recordVisit,

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
  }, [state, accountId, threads, session, huntResults, economyError, pending, reloadEconomy, runEconomy, recordVisit, connections, loadConnections])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
