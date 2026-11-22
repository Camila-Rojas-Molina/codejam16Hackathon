// Review rows for the mode-specific contexts. Visibility here matches publicProfile() in privacy.ts.
import { formatRange } from '../onboarding/questionnaire'
import type { SummaryItem } from './components/SummaryList'
import { formatTripDates } from './model'
import {
  ACCESSIBILITY_OPTIONS,
  ATTRACTION_OPTIONS,
  AVAILABILITY_OPTIONS,
  BUDGET_OPTIONS,
  COMPANION_OPTIONS,
  DURATION_OPTIONS,
  HOST_ACTIVITY_OPTIONS,
  INTEREST_OPTIONS,
  TRANSPORT_OPTIONS,
  labelFor,
  labelsFor,
} from './options'
import type { LocalContext, TouristTrip } from './types'

const list = (items: string[], empty = 'Not answered') => (items.length > 0 ? items.join(', ') : empty)

export function companionText(trip: TouristTrip) {
  if (!trip.companions) return 'Not answered'
  const label = labelFor(COMPANION_OPTIONS, trip.companions)
  if (trip.companions === 'solo') return label
  return `${label} (${trip.companionCount} ${trip.companionCount === 1 ? 'other person' : 'others'})`
}

export function tripItems(trip: TouristTrip): SummaryItem[] {
  const range = formatRange(trip.budget.range)
  const budget = labelFor(BUDGET_OPTIONS, trip.budget.level) || 'Not answered'
  const access = labelsFor(ACCESSIBILITY_OPTIONS, trip.accessibility.needs)
  if (trip.accessibility.notes.trim()) access.push(`“${trip.accessibility.notes.trim()}”`)
  return [
    { id: 'where', label: 'Destination', icon: 'pin' as const, value: trip.destination || 'Not answered', visibility: 'public' },
    { id: 'where', label: 'When', icon: 'calendar' as const, value: formatTripDates(trip) || 'Not answered', visibility: 'public' },
    { id: 'who', label: 'Travelling', icon: 'people2' as const, value: companionText(trip), visibility: 'private' },
    { id: 'budget', label: 'Trip budget', icon: 'coins' as const, value: range ? `${budget}, ${range}` : budget, visibility: 'private' },
    { id: 'interests', label: 'Into on this trip', icon: 'heart' as const, value: list(labelsFor(INTEREST_OPTIONS, trip.interests)), visibility: 'public' },
    { id: 'activities', label: 'Want to see', icon: 'camera' as const, value: list(labelsFor(ATTRACTION_OPTIONS, trip.activities)), visibility: 'public' },
    { id: 'access', label: 'Extra needs this trip', icon: 'shield' as const, value: list(access, 'None'), visibility: 'private' },
  ].map((item, i) => ({ ...item, id: `${item.id}#${i}` }) as SummaryItem)
}

export function localItems(local: LocalContext): SummaryItem[] {
  const gems = local.hiddenGems.trim()
  return [
    { id: 'home', label: 'Hosting city', icon: 'house' as const, value: local.homeCity || 'Not answered', visibility: 'public' },
    { id: 'home', label: 'Neighbourhood', icon: 'map' as const, value: local.neighbourhood || 'Not shared', visibility: 'private' },
    { id: 'turf', label: 'Know really well', icon: 'compass' as const, value: list(local.knownAreas, 'Skipped'), visibility: 'public' },
    { id: 'turf', label: 'Love recommending', icon: 'star' as const, value: list(labelsFor(ATTRACTION_OPTIONS, local.recommendations), 'Skipped'), visibility: 'public' },
    { id: 'turf', label: 'Hidden gems', icon: 'gem' as const, value: gems ? `“${gems}”` : 'Skipped', visibility: 'private' },
    { id: 'hosting', label: 'Happy to do', icon: 'people3' as const, value: list(labelsFor(HOST_ACTIVITY_OPTIONS, local.activities)), visibility: 'public' },
    { id: 'languages', label: 'Can host in', icon: 'chat' as const, value: list(local.languages), visibility: 'public' },
    { id: 'languages', label: 'Getting around', icon: 'shoe' as const, value: list(labelsFor(TRANSPORT_OPTIONS, local.transport), 'Skipped'), visibility: 'private' },
    { id: 'time', label: 'Usually free', icon: 'calendar' as const, value: list(labelsFor(AVAILABILITY_OPTIONS, local.availability)), visibility: 'public' },
    { id: 'time', label: 'Typical outing', icon: 'clock' as const, value: labelFor(DURATION_OPTIONS, local.duration) || 'Not answered', visibility: 'public' },
  ].map((item, i) => ({ ...item, id: `${item.id}#${i}` }) as SummaryItem)
}

/** Summary items carry "<stepId>#<n>" ids so several rows can point at one step. */
export const stepIdOf = (itemId: string) => itemId.split('#')[0]
