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
    { id: 'where', label: 'Destination', value: trip.destination || 'Not answered', visibility: 'public' },
    { id: 'where', label: 'When', value: formatTripDates(trip) || 'Not answered', visibility: 'public' },
    { id: 'who', label: 'Travelling', value: companionText(trip), visibility: 'private' },
    { id: 'budget', label: 'Trip budget', value: range ? `${budget}, ${range}` : budget, visibility: 'private' },
    { id: 'interests', label: 'Into on this trip', value: list(labelsFor(INTEREST_OPTIONS, trip.interests)), visibility: 'public' },
    { id: 'activities', label: 'Want to see', value: list(labelsFor(ATTRACTION_OPTIONS, trip.activities)), visibility: 'public' },
    { id: 'access', label: 'Extra needs this trip', value: list(access, 'None'), visibility: 'private' },
  ].map((item, i) => ({ ...item, id: `${item.id}#${i}` }) as SummaryItem)
}

export function localItems(local: LocalContext): SummaryItem[] {
  const gems = local.hiddenGems.trim()
  return [
    { id: 'home', label: 'Hosting city', value: local.homeCity || 'Not answered', visibility: 'public' },
    { id: 'home', label: 'Neighbourhood', value: local.neighbourhood || 'Not shared', visibility: 'private' },
    { id: 'turf', label: 'Know really well', value: list(local.knownAreas, 'Skipped'), visibility: 'public' },
    { id: 'turf', label: 'Love recommending', value: list(labelsFor(ATTRACTION_OPTIONS, local.recommendations), 'Skipped'), visibility: 'public' },
    { id: 'turf', label: 'Hidden gems', value: gems ? `“${gems}”` : 'Skipped', visibility: 'private' },
    { id: 'hosting', label: 'Happy to do', value: list(labelsFor(HOST_ACTIVITY_OPTIONS, local.activities)), visibility: 'public' },
    { id: 'languages', label: 'Can host in', value: list(local.languages), visibility: 'public' },
    { id: 'languages', label: 'Getting around', value: list(labelsFor(TRANSPORT_OPTIONS, local.transport), 'Skipped'), visibility: 'private' },
    { id: 'time', label: 'Usually free', value: list(labelsFor(AVAILABILITY_OPTIONS, local.availability)), visibility: 'public' },
    { id: 'time', label: 'Typical outing', value: labelFor(DURATION_OPTIONS, local.duration) || 'Not answered', visibility: 'public' },
  ].map((item, i) => ({ ...item, id: `${item.id}#${i}` }) as SummaryItem)
}

/** Summary items carry "<stepId>#<n>" ids so several rows can point at one step. */
export const stepIdOf = (itemId: string) => itemId.split('#')[0]
