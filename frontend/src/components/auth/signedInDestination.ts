// Where a signed-in person goes from Log in / Sign up (and Welcome): finish onboarding first,
// otherwise back to the page that sent them to log in, or the map.
import type { Location } from 'react-router'
import { nextOnboardingStep } from '../../features/profile/flow'
import type { Account, ProfileRecord } from '../../features/profile/types'

const AUTH_PAGES = ['/', '/login', '/signup']

export function signedInDestination(account: Account | null, profile: ProfileRecord | null, state: unknown): string {
  const next = nextOnboardingStep(account, profile)
  if (next) return next
  const from = (state as { from?: Location } | null)?.from
  if (from?.pathname && !AUTH_PAGES.includes(from.pathname)) return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  return '/map'
}
