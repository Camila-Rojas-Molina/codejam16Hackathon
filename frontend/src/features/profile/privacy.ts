// What other people can see. Anything not returned by publicProfile() stays private: it may be
// used for matching, but it is never shown to another person.
//
// Public: name, avatar, home city, cities discovered, vibe, planning and decision style, interests, ideal adventure, topics, pace,
//         must-see spots, group size, languages, and the city-level context of the active mode.
// Private: comfort meeting new people, buddy qualities, budget and spending range, food and dietary
//          needs, transport, neighbourhood, hidden gems, trip party, and accessibility (unless the
//          person turns on sharing with matches; notes are never shared).
// Keep in sync with the `visibility` of rows in features/onboarding/questionnaire.tsx and
// features/profile/contextSummary.ts.
import { activeTrip, formatTripDates } from './model'
import type {
  AccessibilityNeed,
  Account,
  AdventureIdea,
  Attraction,
  Availability,
  DecisionStyle,
  DogPreference,
  ExploreMode,
  GroupSize,
  HostActivity,
  HostDuration,
  Interest,
  Pace,
  PlanningStyle,
  ProfileRecord,
  SocialEnergy,
  Topic,
} from './types'

export type PublicProfile = {
  name: string
  avatar: string
  homeCity: string
  citiesDiscovered: string[]
  mode: ExploreMode | null
  energy: SocialEnergy | null
  planning: PlanningStyle | null
  decisions: DecisionStyle | null
  interests: Interest[]
  topics: Topic[]
  pace: Pace | null
  attractions: Attraction[]
  groupSize: GroupSize | null
  idealAdventure: AdventureIdea | null
  idealAdventureNote: string
  languages: string[]
  preferredLanguages: string[]
  /** Only present when the person opted in. */
  accessibilityNeeds?: AccessibilityNeed[]
  tourist?: { destination: string; when: string; interests: Interest[]; activities: Attraction[] }
  local?: {
    homeCity: string
    knownAreas: string[]
    recommendations: Attraction[]
    activities: HostActivity[]
    languages: string[]
    availability: Availability[]
    duration: HostDuration | null
    dogs: DogPreference | null
  }
}

export function publicProfile(account: Account, record: ProfileRecord): PublicProfile {
  const u = record.universal
  const trip = activeTrip(record)
  const local = record.local
  const view: PublicProfile = {
    name: account.name,
    avatar: account.avatar,
    homeCity: u?.homeCity.trim() ?? '',
    citiesDiscovered: u?.citiesDiscovered.map((c) => c.name) ?? [],
    mode: record.activeMode,
    energy: u?.personality.energy ?? null,
    planning: u?.personality.planning ?? null,
    decisions: u?.personality.decisions ?? null,
    interests: u?.interests ?? [],
    topics: u?.companion.topics ?? [],
    pace: u?.exploration.pace ?? null,
    attractions: u?.exploration.attractions ?? [],
    groupSize: u?.exploration.groupSize ?? null,
    idealAdventure: u?.companion.idealAdventure ?? null,
    idealAdventureNote: u?.companion.idealAdventureNote ?? '',
    languages: u?.languages.spoken ?? [],
    preferredLanguages: u?.languages.preferred ?? [],
  }
  if (u?.accessibility.shareWithMatches && u.accessibility.needs.length > 0) {
    view.accessibilityNeeds = [...u.accessibility.needs]
  }
  if (record.activeMode === 'tourist' && trip) {
    view.tourist = { destination: trip.destination, when: formatTripDates(trip), interests: trip.interests, activities: trip.activities }
  }
  if (record.activeMode === 'local' && local) {
    // Neighbourhood, hidden gems and transport stay private.
    view.local = {
      homeCity: local.homeCity,
      knownAreas: local.knownAreas,
      recommendations: local.recommendations,
      activities: local.activities,
      languages: local.languages,
      availability: local.availability,
      duration: local.duration,
      dogs: local.dogs,
    }
  }
  return view
}
