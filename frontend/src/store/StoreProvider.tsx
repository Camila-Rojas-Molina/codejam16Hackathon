import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { StoreContext, type StoreValue } from './context'
import { loadState, reducer, saveState } from './state'

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      setUser: (user) => dispatch({ type: 'setUser', user }),
      setPartner: (partner) => dispatch({ type: 'setPartner', partner }),
      completeHunt: (result) => dispatch({ type: 'completeHunt', ...result }),
      setDemoMode: (on) => dispatch({ type: 'setDemoMode', on }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
