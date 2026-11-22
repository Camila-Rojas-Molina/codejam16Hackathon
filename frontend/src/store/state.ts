import type { EconomyState } from '../features/economy/types'
import { activeTrip, normalizeRecord } from '../features/profile/model'
import { normalizeEconomyState } from '../lib/economy/normalize'
import type { Account, ProfileRecord } from '../features/profile/types'
import { readJSON, writeJSON } from '../lib/storage'
import type { HuntResult, ScoreBreakdown, Team, User } from '../lib/types'

/** A partner, team and results for one exploring context (a trip, or Local mode). */
export type MatchSession = {
  partner: User | null
  team: Team | null
  results: Record<string, HuntResult>
}

export type AppState = {
  /** The signed-in account on this device. One per person, whichever mode they use. */
  account: Account | null
  /** Cached copy of the account's profile record. The source of truth is api.ts. */
  profile: ProfileRecord | null
  partner: User | null
  team: Team | null
  /** Completed hunts by id. */
  results: Record<string, HuntResult>
  /**
   * Matches for the contexts you're not in right now, keyed by contextKey(). Switching from a
   * Paris trip to Local mode and back brings the Paris teammate back.
   */
  parked: Record<string, MatchSession>
  /** Settings toggle for demo mode (?demo=1 in the URL also turns it on). */
  demoMode: boolean
  /**
   * Last points/quests/inventory state for `account` (lib/economy). A cache so the balance shows
   * straight away on reload; the server (or the device economy) is the source of truth.
   */
  economy: EconomyState | null
}

export type Action =
  | { type: 'signIn'; account: Account; profile: ProfileRecord }
  | { type: 'setAccount'; account: Account }
  | { type: 'setProfile'; profile: ProfileRecord }
  | { type: 'setPartner'; partner: User }
  | { type: 'clearMatch' }
  | { type: 'completeHunt'; huntId: string; score: ScoreBreakdown; secondsLeft: number; selfieUrl?: string }
  | { type: 'setDemoMode'; on: boolean }
  | { type: 'setEconomy'; accountId: string; economy: EconomyState }
  | { type: 'reset' }

const STORAGE_KEY = 'migo:state:v2'

const emptySession: MatchSession = { partner: null, team: null, results: {} }

export const initialState: AppState = {
  account: null,
  profile: null,
  ...emptySession,
  parked: {},
  demoMode: false,
  economy: null,
}

/** Which exploring context the profile is in: a specific trip, Local mode, or nothing yet. */
export function contextKey(profile: ProfileRecord | null): string {
  if (profile?.activeMode === 'tourist') return `tourist:${activeTrip(profile)?.id ?? 'none'}`
  if (profile?.activeMode === 'local') return 'local'
  return 'none'
}

/** The signed-in person as a match participant, in whichever mode they're using. */
export function currentUser(state: Pick<AppState, 'account' | 'profile'>): User | null {
  const { account, profile } = state
  if (!account) return null
  return {
    id: account.id,
    name: account.name,
    avatar: account.avatar,
    role: profile?.activeMode ?? 'tourist',
    interests: profile?.universal?.interests,
    languages: profile?.universal?.languages.spoken,
  }
}

const TEAM_ADJECTIVES = ['Wandering', 'Lucky', 'Sneaky', 'Brave', 'Curious', 'Speedy', 'Midnight', 'Rooftop']
const TEAM_NOUNS = ['Pigeons', 'Raccoons', 'Squirrels', 'Bagels', 'Beavers', 'Gulls', 'Maples', 'Cyclists']

// Stable fun name from the two member ids, so it doesn't change on re-render.
function teamName(a: User, b: User) {
  let hash = 0
  for (const ch of a.id + b.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `The ${TEAM_ADJECTIVES[hash % TEAM_ADJECTIVES.length]} ${TEAM_NOUNS[(hash >>> 8) % TEAM_NOUNS.length]}`
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'signIn':
      // A new account starts fresh: no match, no results. Keeps the demo setting.
      return { ...initialState, demoMode: state.demoMode, account: action.account, profile: action.profile }

    case 'setAccount': {
      // Keep the name/avatar on the current team card in sync with profile edits.
      const team =
        state.team && state.team.members[0].id === action.account.id
          ? {
              ...state.team,
              members: [
                { ...state.team.members[0], name: action.account.name, avatar: action.account.avatar },
                state.team.members[1],
              ] as Team['members'],
            }
          : state.team
      return { ...state, account: action.account, team }
    }

    case 'setProfile': {
      const before = contextKey(state.profile)
      const after = contextKey(action.profile)
      if (before === after) return { ...state, profile: action.profile }
      // Context changed (mode switch or a different trip): park this match, restore that one.
      const parked = { ...state.parked }
      if (state.team || state.partner) parked[before] = { partner: state.partner, team: state.team, results: state.results }
      else delete parked[before]
      const restored = parked[after] ?? emptySession
      delete parked[after]
      return { ...state, profile: action.profile, ...restored, parked }
    }

    case 'setPartner': {
      const user = currentUser(state)
      if (!user) return state
      const team: Team = {
        id: 'my-team',
        name: teamName(user, action.partner),
        members: [user, action.partner],
        points: 0,
        completedHuntIds: [],
      }
      return { ...state, partner: action.partner, team, results: {} }
    }

    case 'clearMatch':
      return { ...state, ...emptySession }

    case 'completeHunt': {
      if (!state.team) return state
      const results: AppState['results'] = {
        ...state.results,
        [action.huntId]: {
          huntId: action.huntId,
          score: action.score,
          secondsLeft: action.secondsLeft,
          completedAt: Date.now(),
          selfieUrl: action.selfieUrl,
        },
      }
      const all = Object.values(results)
      const team: Team = {
        ...state.team,
        points: all.reduce((sum, r) => sum + r.score.total, 0),
        completedHuntIds: all.map((r) => r.huntId),
      }
      return { ...state, results, team }
    }

    case 'setDemoMode':
      return { ...state, demoMode: action.on }

    case 'setEconomy':
      // A late answer for an account that has since signed out (or switched) is dropped.
      if (state.account?.id !== action.accountId) return state
      return { ...state, economy: action.economy }

    case 'reset':
      return { ...initialState, demoMode: state.demoMode }
  }
}

export function loadState(): AppState {
  const saved = readJSON<Partial<AppState>>(STORAGE_KEY)
  if (!saved || typeof saved !== 'object') return initialState
  // The cached profile may come from an older version of the app: fill any missing fields so the
  // first render works before the fresh copy arrives from api.ts.
  const account = saved.account && typeof saved.account.id === 'string' ? saved.account : null
  const profile = account && saved.profile ? normalizeRecord(saved.profile, account.id) : null
  const economy = account && saved.economy ? normalizeEconomyState(saved.economy, saved.economy.source === 'server' ? 'server' : 'device') : null
  return { ...initialState, ...saved, account, profile, results: saved.results ?? {}, parked: saved.parked ?? {}, economy }
}

const withoutSelfies = (results: Record<string, HuntResult>) =>
  Object.fromEntries(Object.entries(results).map(([id, r]) => [id, { ...r, selfieUrl: undefined }]))

/** Persists everything except selfie images (they're large and don't need to survive reloads). */
export function saveState(state: AppState) {
  const parked = Object.fromEntries(
    Object.entries(state.parked).map(([key, s]) => [key, { ...s, results: withoutSelfies(s.results) }]),
  )
  writeJSON(STORAGE_KEY, { ...state, results: withoutSelfies(state.results), parked })
}
