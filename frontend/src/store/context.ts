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
import type { EconomyPage } from '../lib/economy'
import type { PlacePick } from '../features/places/types'
import type { HuntResult, ScoreBreakdown, User } from '../lib/types'
import type { EconomyState } from '../features/economy/types'
import type { AppState } from './state'

export type StoreValue = AppState & {
  /** The signed-in person as a match participant (role = their active mode). */
  user: User | null
  setPartner: (partner: User) => void
  clearMatch: () => void
  completeHunt: (result: { huntId: string; score: ScoreBreakdown; secondsLeft: number; selfieUrl?: string }) => void
  setDemoMode: (on: boolean) => void
  /** Signs out on this device without deleting anything (also ends the login when authEnabled). */
  reset: () => void

  // Login (Supabase Auth, email + password)
  /** True when Supabase is configured: then a login is required. False = device-only mode, no login. */
  authEnabled: boolean
  /** The signed-in login (null when signed out, or always null when authEnabled is false). */
  session: { email: string } | null
  /** Creates a login. needsConfirmation = the user must click the email link, then log in. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  /** Logs in and loads that login's profile. hasProfile=false → send them to /onboarding. */
  signIn: (email: string, password: string) => Promise<{ hasProfile: boolean }>
  /** Logs out and clears this device's cached account, profile and match. */
  signOut: () => Promise<void>

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
  /**
   * Permanently deletes the account and all its answers, then signs out. `then` runs in the same
   * update as the sign-out (pass the navigation away, e.g. to the Welcome page).
   */
  deleteAccount: (then?: () => void) => Promise<void>

  // Cities discovered (universal profile)
  addCity: (place: PlacePick) => Promise<ProfileRecord>
  removeCity: (cityId: string) => Promise<ProfileRecord>

  // Points, quests & shop (lib/economy: the server when signed in to Supabase, else this device).
  // `economy` is also mirrored into `profile.rewards` (ledger/owned/equipped, read-only) so older
  // code that reads the record keeps working; nothing writes points into the record any more.
  /** Completed hunts across every exploring context (current and parked). */
  huntResults: HuntResult[]
  /** Balance, ledger, quests, inventory. Null until the first load (or when signed out). */
  economy: EconomyState | null
  /** The last economy failure (load or action), as a message to show. Cleared by the next success. */
  economyError: string | null
  /** Keys of economy actions in flight ('claim:<id>', 'refresh:<id>', 'purchase:<id>', 'equip:<id>'), to disable buttons. */
  economyPending: readonly string[]
  /** Re-reads the economy (e.g. after something that may have moved a quest on). */
  reloadEconomy: () => Promise<void>
  /** Claims a finished quest's reward. Throws the server's message (e.g. not finished yet). */
  claimQuest: (assignmentId: string) => Promise<void>
  /** Swaps one daily quest for another (once per day). Throws 'Daily refresh already used' etc. */
  refreshDaily: (assignmentId: string) => Promise<void>
  /** Buys an item. Does NOT put it on. Throws 'Not enough points' etc. */
  purchase: (itemId: string) => Promise<void>
  /** Puts an owned item on (replacing that slot) or takes it off. */
  setEquipped: (itemId: string, on: boolean) => Promise<void>
  /** Records that a section of the app was opened (visit quests). Once per page per account. */
  recordVisit: (page: EconomyPage) => void

  // People & messages
  setLiked: (personId: string, liked: boolean) => Promise<ProfileRecord>
  /** Message threads by person id (loaded from api.ts). */
  threads: Record<string, Thread>
  sendMessage: (person: Person, text: string) => Promise<void>
  markRead: (personId: string) => Promise<void>
}

export const StoreContext = createContext<StoreValue | null>(null)
