import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import * as api from '../lib/api'
import type { ProfileRecord } from '../features/profile/types'
import { StoreContext, type StoreValue } from './context'
import { currentUser, loadState, reducer, saveState } from './state'

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const accountId = state.account?.id ?? null

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
    }
  }, [state, accountId])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
