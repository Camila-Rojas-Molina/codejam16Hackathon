// The MIGO profile model: one account, one universal profile, and context for each mode.
//
//   Account           who you are (name, avatar). One per person, never per role.
//   UniversalProfile  personality + general preferences. Filled in once at onboarding.
//   TouristTrip[]     context for Tourist mode, one per trip. Defaults copied from the universal profile.
//   LocalContext      context for Local mode (home city, hosting style). Optional until first use.
//   ProfileRecord     ties it together with the account state (active mode, active trip).
//
// Single-choice answers are `T | null` so an unfinished draft has the same shape as a saved profile.
// `validation.ts` decides what "complete" means; `privacy.ts` decides what other people can see.
import type { Role } from '../../lib/types'
import type { PlacePick } from '../places/types'

/** Tourist or Local. Contextual, switchable at any time; never an account type. */
export type ExploreMode = Role

export type Account = {
  id: string
  name: string
  avatar: string
  createdAt: number
}

// ---- Get to know you -------------------------------------------------------------------------

export type SocialEnergy = 'introvert' | 'ambivert' | 'extrovert'
export type NewPeopleComfort = 'love-it' | 'warm-up' | 'familiar-first'
export type PlanningStyle = 'planner' | 'loose-plan' | 'spontaneous'
export type DecisionStyle = 'lead' | 'together' | 'follow'

export type Interest =
  | 'history'
  | 'food'
  | 'architecture'
  | 'art'
  | 'music'
  | 'sports'
  | 'nature'
  | 'photography'
  | 'technology'
  | 'nightlife'
  | 'shopping'
  | 'traditions'

export type CompanionQuality =
  | 'curious'
  | 'funny'
  | 'easygoing'
  | 'knowledgeable'
  | 'adventurous'
  | 'good-listener'
  | 'chatty'
  | 'calm'
  | 'punctual'
  | 'respectful'

export type AdventureIdea = 'wander' | 'food-crawl' | 'culture-hop' | 'outdoors' | 'night-out' | 'local-life'

export type Topic =
  | 'travel'
  | 'food'
  | 'books-film'
  | 'music'
  | 'sports'
  | 'tech'
  | 'history'
  | 'art-design'
  | 'nature'
  | 'languages'
  | 'games'
  | 'careers'

// ---- Exploration style ------------------------------------------------------------------------

export type BudgetLevel = 'free' | 'budget' | 'moderate' | 'comfortable' | 'luxury'
export type Currency = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'MXN' | 'JPY' | 'AUD' | 'INR'
/** Approximate spend per outing. Both ends optional. */
export type SpendRange = { min: number | null; max: number | null; currency: Currency }
export type Budget = { level: BudgetLevel | null; range: SpendRange | null }

export type Pace = 'relaxed' | 'balanced' | 'fast' | 'spontaneous'

export type Attraction =
  | 'landmarks'
  | 'hidden-gems'
  | 'historical'
  | 'museums'
  | 'nature'
  | 'food-spots'
  | 'shopping'
  | 'nightlife'
  | 'sports'
  | 'cultural'
  | 'photo-spots'

export type FoodStyle = 'street-food' | 'local-specialties' | 'restaurants-cafes' | 'fine-dining' | 'food-markets'
export type Dietary = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free' | 'dairy-free' | 'nut-free'

export type Transport = 'walking' | 'transit' | 'cycling' | 'driving' | 'flexible'
export type GroupSize = 'one-on-one' | 'small-group' | 'large-group' | 'no-preference'

/** Practical needs only. We never ask for a diagnosis. */
export type AccessibilityNeed = 'step-free' | 'wheelchair' | 'accessible-transit' | 'quiet' | 'rest-stops'

/** Where a discovered city came from. Manual today; quests and trips can add them automatically later. */
export type CitySource = 'manual' | 'trip' | 'quest'

export type DiscoveredCity = {
  id: string
  /** City name, e.g. "Lisbon". */
  name: string
  /** English country name and ISO code. Empty on cities typed in before city search existed. */
  country: string
  countryCode: string
  /** First-level region when it tells places apart (e.g. "OR"). */
  region?: string
  /** Coordinates for the atlas pin. Null on older free-text entries until they're confirmed. */
  lat: number | null
  lng: number | null
  /** Provider id, e.g. "geonames:2267057". Null on older free-text entries. */
  placeId: string | null
  source: CitySource
  /** Trip or quest id when added automatically. */
  refId?: string
  addedAt: number
}

/** "Any four-legged amigos?" `no-dogs` is private: used only to filter matches, never shown. */
export type DogStance = 'has-dog' | 'loves-dogs' | 'neutral' | 'no-dogs'
export type DogSize = 'small' | 'medium' | 'large'
export type DogVibe = 'chill' | 'playful' | 'learning'
export type DogSociability = 'yes' | 'sometimes' | 'no'

export type DogDetails = {
  name: string
  size: DogSize | null
  vibe: DogVibe | null
  goodWithDogs: DogSociability | null
  /** Small downscaled JPEG data URL, or null. */
  photo: string | null
}

export type DogAnswer = {
  stance: DogStance | null
  /** Only meaningful when stance is 'has-dog'; cleared on save otherwise. */
  dog: DogDetails
}

export type UniversalProfile = {
  /**
   * The city the person lives in, as plain text (= homeCityPlace.name). Kept for matching and the
   * SQL `home_city` column. Never inferred from GPS.
   */
  homeCity: string
  /** The real place picked on the map. Null on older profiles that only have typed text. */
  homeCityPlace: PlacePick | null
  /** Places they've explored. Part of the universal profile, so no mode can overwrite it. */
  citiesDiscovered: DiscoveredCity[]
  personality: {
    energy: SocialEnergy | null
    newPeople: NewPeopleComfort | null
    planning: PlanningStyle | null
    decisions: DecisionStyle | null
  }
  interests: Interest[]
  companion: {
    qualities: CompanionQuality[]
    idealAdventure: AdventureIdea | null
    /** Optional short answer, in their own words. */
    idealAdventureNote: string
    topics: Topic[]
  }
  exploration: {
    budget: Budget
    pace: Pace | null
    attractions: Attraction[]
    food: { styles: FoodStyle[]; dietary: Dietary[]; notes: string }
    transport: Transport[]
    groupSize: GroupSize | null
  }
  languages: {
    spoken: string[]
    /** Subset of `spoken`. Empty means "any of the ones I speak". */
    preferred: string[]
  }
  /** Private by default. Only shared with matches when `shareWithMatches` is on. */
  accessibility: {
    needs: AccessibilityNeed[]
    notes: string
    shareWithMatches: boolean
  }
  /** Optional. May be missing on profiles saved before this question existed; read via dogsOf(). */
  dogs: DogAnswer
}

// ---- Tourist mode -----------------------------------------------------------------------------

export type TravelCompanions = 'solo' | 'partner' | 'friends' | 'family'

export type TouristTrip = {
  id: string
  destination: string
  /** Exact dates (ISO yyyy-mm-dd) or a loose description like "a weekend in July". */
  dates: { kind: 'dates' | 'approx'; start: string; end: string; approx: string }
  companions: TravelCompanions | null
  /** People travelling with you, not counting you. 0 when solo. */
  companionCount: number
  /** Copied from the universal profile when the trip is created, then edited per trip. */
  budget: Budget
  interests: Interest[]
  activities: Attraction[]
  /** Extra needs for this trip only, on top of the universal ones. */
  accessibility: { needs: AccessibilityNeed[]; notes: string }
  createdAt: number
  updatedAt: number
}

// ---- Local mode -------------------------------------------------------------------------------

export type HostActivity =
  | 'walking-tour'
  | 'food-crawl'
  | 'coffee-chat'
  | 'museums'
  | 'outdoors'
  | 'photo-walk'
  | 'nightlife'
  | 'markets'
  | 'sports'
  | 'cultural-events'

export type Availability = 'weekday-day' | 'weekday-evening' | 'weekend-day' | 'weekend-evening'
export type HostDuration = 'quick' | 'couple-hours' | 'half-day' | 'full-day'

export type LocalContext = {
  /** Picked by the person (= homeCityPlace.name). Never inferred from GPS. */
  homeCity: string
  /** The real place picked on the map. Null on older local profiles that only have typed text. */
  homeCityPlace: PlacePick | null
  neighbourhood: string
  languages: string[]
  knownAreas: string[]
  recommendations: Attraction[]
  hiddenGems: string
  activities: HostActivity[]
  availability: Availability[]
  duration: HostDuration | null
  transport: Transport[]
  updatedAt: number
}

// ---- Account state ----------------------------------------------------------------------------

// ---- Rewards & social --------------------------------------------------------------------------

/** Where a shop item goes on your avatar: worn pieces, plus the backdrop behind the picture. */
export type AccessorySlot = 'head' | 'face' | 'neck' | 'backdrop'

/** One change to the points balance. The balance is the sum of the ledger. */
export type PointsEntry = {
  id: string
  amount: number
  reason: 'challenge' | 'purchase'
  /** e.g. "challenge:daily-hunt:2026-11-21" or "item:shades". Unique per reason, so nothing pays twice. */
  refId: string
  label: string
  at: number
}

export type Rewards = {
  ledger: PointsEntry[]
  /** Shop item ids the person owns. */
  owned: string[]
  /** What your avatar is wearing, one item per slot. (Saved under the same key as when Migo wore them.) */
  equipped: Partial<Record<AccessorySlot, string>>
}

export type ProfileRecord = {
  accountId: string
  universal: UniversalProfile | null
  /** Set when the onboarding questionnaire is submitted. Returning users skip onboarding. */
  universalCompletedAt: number | null
  activeMode: ExploreMode | null
  tourist: { trips: TouristTrip[]; activeTripId: string | null }
  local: LocalContext | null
  rewards: Rewards
  /**
   * Legacy: people this account tapped "Show interest" on, before connection requests replaced it.
   * Kept so no saved data is lost; nothing reads it any more.
   */
  likes: string[]
  /**
   * People removed from Messages: person id → when. Their messages are kept, just hidden; they come
   * back only through a connection accepted after that time (same conversation, never a duplicate).
   */
  removedChats: Record<string, number>
  /** The guided tour (features/tutorial). Null = never offered (accounts from before it existed). */
  tutorial: TutorialState | null
  updatedAt: number
}

/** pending = show it on the next visit to the hub; completed / skipped = never auto-show again. */
export type TutorialState = { status: 'pending' | 'completed' | 'skipped'; at: number }
