// Where someone should be, given how far they've got. Returning users skip anything already done.
//
//   no account                → /onboarding            (name + avatar)
//   universal profile missing → /onboarding/questions  (Get to know you + Your exploration style)
//   no mode picked yet        → /mode                  (Tourist or Local)
//   mode picked, no context   → /mode/tourist or /mode/local (short setup for that mode)
import { isLocalComplete, isTripComplete, activeTrip } from './model'
import type { Account, ProfileRecord } from './types'

export function nextOnboardingStep(account: Account | null, profile: ProfileRecord | null): string | null {
  if (!account) return '/onboarding'
  if (!profile?.universalCompletedAt || !profile.universal) return '/onboarding/questions'
  if (!profile.activeMode) return '/mode'
  if (profile.activeMode === 'tourist' && !isTripComplete(activeTrip(profile))) return '/mode/tourist'
  if (profile.activeMode === 'local' && !isLocalComplete(profile.local)) return '/mode/local'
  return null
}

/** True once the universal questionnaire has been submitted (modes can be set up later). */
export function hasUniversalProfile(profile: ProfileRecord | null) {
  return !!profile?.universalCompletedAt && !!profile.universal
}

/** Router state for the mode setups: whether saving switches modes, and where to go afterwards. */
export type SetupNavState = { activate?: boolean; returnTo?: string } | null
