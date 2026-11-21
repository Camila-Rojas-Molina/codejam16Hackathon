import { createContext } from 'react'
import type {
  Account,
  ExploreMode,
  LocalContext,
  ProfileRecord,
  TouristTrip,
  UniversalProfile,
} from '../features/profile/types'
import type { ScoreBreakdown, User } from '../lib/types'
import type { AppState } from './state'

export type StoreValue = AppState & {
  /** The signed-in person as a match participant (role = their active mode). */
  user: User | null
  setPartner: (partner: User) => void
  clearMatch: () => void
  completeHunt: (result: { huntId: string; score: ScoreBreakdown; secondsLeft: number; selfieUrl?: string }) => void
  setDemoMode: (on: boolean) => void
  /** Signs out on this device without deleting anything. */
  reset: () => void

  // Account & profile. Each one saves through api.ts, then updates the store.
  createAccount: (input: { name: string; avatar: string }) => Promise<Account>
  updateAccount: (input: { name: string; avatar: string }) => Promise<Account>
  saveUniversal: (universal: UniversalProfile) => Promise<ProfileRecord>
  switchMode: (mode: ExploreMode) => Promise<ProfileRecord>
  saveTrip: (trip: TouristTrip, opts?: { activate?: boolean }) => Promise<ProfileRecord>
  activateTrip: (tripId: string) => Promise<ProfileRecord>
  deleteTrip: (tripId: string) => Promise<ProfileRecord>
  saveLocal: (local: LocalContext, opts?: { activate?: boolean }) => Promise<ProfileRecord>
  clearLocal: () => Promise<ProfileRecord>
  /** Permanently deletes the account and all its answers, then signs out. */
  deleteAccount: () => Promise<void>
}

export const StoreContext = createContext<StoreValue | null>(null)
