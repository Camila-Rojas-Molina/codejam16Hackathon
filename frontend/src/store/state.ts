import { readJSON, writeJSON } from '../lib/storage'
import type { HuntResult, ScoreBreakdown, Team, User } from '../lib/types'

export type AppState = {
  user: User | null
  partner: User | null
  team: Team | null
  /** Completed hunts by id. */
  results: Record<string, HuntResult>
  /** Settings toggle for demo mode (?demo=1 in the URL also turns it on). */
  demoMode: boolean
}

export type Action =
  | { type: 'setUser'; user: User }
  | { type: 'setPartner'; partner: User }
  | { type: 'completeHunt'; huntId: string; score: ScoreBreakdown; secondsLeft: number; selfieUrl?: string }
  | { type: 'setDemoMode'; on: boolean }
  | { type: 'reset' }

const STORAGE_KEY = 'tq:state:v1'

export const initialState: AppState = {
  user: null,
  partner: null,
  team: null,
  results: {},
  demoMode: false,
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
    case 'setUser':
      // A new player starts fresh: new match, new team, no results. Keeps the demo setting.
      return { ...initialState, demoMode: state.demoMode, user: action.user }

    case 'setPartner': {
      if (!state.user) return state
      const team: Team = {
        id: 'my-team',
        name: teamName(state.user, action.partner),
        members: [state.user, action.partner],
        points: 0,
        completedHuntIds: [],
      }
      return { ...state, partner: action.partner, team, results: {} }
    }

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

    case 'reset':
      return initialState
  }
}

export function loadState(): AppState {
  const saved = readJSON<Partial<AppState>>(STORAGE_KEY)
  if (!saved || typeof saved !== 'object') return initialState
  return { ...initialState, ...saved, results: saved.results ?? {} }
}

/** Persists everything except selfie images (they're large and don't need to survive reloads). */
export function saveState(state: AppState) {
  const results = Object.fromEntries(
    Object.entries(state.results).map(([id, r]) => [id, { ...r, selfieUrl: undefined }]),
  )
  writeJSON(STORAGE_KEY, { ...state, results })
}
