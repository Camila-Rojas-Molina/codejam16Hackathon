import { createContext } from 'react'
import type {
  Account,
  ExploreMode,
  LocalContext,
  ProfileRecord,
  TouristTrip,
  UniversalProfile,
} from '../features/profile/types'
import type { Person, Thread } from '../features/chat/types'
import type { HuntResult, ScoreBreakdown, User } from '../lib/types'
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

  // Cities discovered (universal profile)
  addCity: (name: string) => Promise<ProfileRecord>
  removeCity: (cityId: string) => Promise<ProfileRecord>

  // Points, challenges & shop
  /** Completed hunts across every exploring context (current and parked). */
  huntResults: HuntResult[]
  claimChallenge: (challengeId: string) => Promise<ProfileRecord>
  purchase: (itemId: string) => Promise<ProfileRecord>
  setEquipped: (itemId: string, on: boolean) => Promise<ProfileRecord>

  // People & messages
  setLiked: (personId: string, liked: boolean) => Promise<ProfileRecord>
  /** Message threads by person id (loaded from api.ts). */
  threads: Record<string, Thread>
  sendMessage: (person: Person, text: string) => Promise<void>
  markRead: (personId: string) => Promise<void>
}

export const StoreContext = createContext<StoreValue | null>(null)
