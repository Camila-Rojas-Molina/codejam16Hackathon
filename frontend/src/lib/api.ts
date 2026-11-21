// The only data-access module. Returns mock data now; swap the bodies for Supabase /
// Google Places later without changing the signatures. Screens must not import mockData.
import { scoreHunt } from '../features/scoring/score'
import { distanceMeters } from './geo'
import { HUNTS, TEAMS, USERS } from './mockData'
import type { Hunt, LatLng, Role, ScoreBreakdown, Team, User } from './types'

// Small fake latency so loading states get exercised.
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(value: T): T => structuredClone(value)

/**
 * Hunts near a location. Today: the curated McGill list, nearest first when a location is given.
 * Later: generated from Google Places around `near` (same Hunt type).
 */
export async function getHunts(near?: LatLng): Promise<Hunt[]> {
  await delay()
  const hunts = clone(HUNTS)
  if (near) hunts.sort((a, b) => distanceMeters(near, a) - distanceMeters(near, b))
  return hunts
}

export async function getHunt(id: string): Promise<Hunt | null> {
  await delay(150)
  const hunt = HUNTS.find((h) => h.id === id)
  return hunt ? clone(hunt) : null
}

/** Picks a partner with the opposite role. */
export async function findPartner(role: Role): Promise<User> {
  await delay()
  const wanted: Role = role === 'tourist' ? 'local' : 'tourist'
  const pool = USERS.filter((u) => u.role === wanted)
  return clone(pool[Math.floor(Math.random() * pool.length)])
}

export type SelfieSubmission = {
  huntId: string
  teamId: string
  /** Object URL or data URL of the selfie. Not uploaded anywhere yet. */
  imageUrl: string
  secondsLeft: number
}

/** Records a selfie and returns the points earned. */
export async function submitSelfie(submission: SelfieSubmission): Promise<ScoreBreakdown> {
  await delay(400)
  const hunt = HUNTS.find((h) => h.id === submission.huntId)
  if (!hunt) throw new Error(`Unknown hunt: ${submission.huntId}`)
  return scoreHunt(hunt, submission.secondsLeft)
}

/** Seeded teams plus the player's own team (if any), highest points first. */
export async function getLeaderboard(myTeam?: Team | null): Promise<Team[]> {
  await delay()
  const teams = clone(TEAMS)
  if (myTeam) teams.push(clone(myTeam))
  return teams.sort((a, b) => b.points - a.points)
}
