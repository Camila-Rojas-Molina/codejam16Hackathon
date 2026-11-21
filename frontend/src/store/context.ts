import { createContext } from 'react'
import type { ScoreBreakdown, User } from '../lib/types'
import type { AppState } from './state'

export type StoreValue = AppState & {
  setUser: (user: User) => void
  setPartner: (partner: User) => void
  completeHunt: (result: { huntId: string; score: ScoreBreakdown; secondsLeft: number; selfieUrl?: string }) => void
  setDemoMode: (on: boolean) => void
  reset: () => void
}

export const StoreContext = createContext<StoreValue | null>(null)
