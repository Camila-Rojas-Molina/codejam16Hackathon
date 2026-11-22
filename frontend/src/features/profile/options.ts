// Every answer option shown in the questionnaire, the mode setups and the profile summary.
// Values are stable ids (stored); labels are copy (safe to reword).
import type { IconName } from '../../components/icons/Icon'
import type {
  AccessibilityNeed,
  AdventureIdea,
  Attraction,
  Availability,
  BudgetLevel,
  CompanionQuality,
  Currency,
  DecisionStyle,
  Dietary,
  DogSize,
  DogSociability,
  DogStance,
  DogVibe,
  FoodStyle,
  GroupSize,
  HostActivity,
  HostDuration,
  Interest,
  NewPeopleComfort,
  Pace,
  PlanningStyle,
  SocialEnergy,
  Topic,
  Transport,
  TravelCompanions,
} from './types'

export type Option<T extends string> = {
  value: T
  label: string
  /** Retro icon shown with the answer (components/icons/Icon.tsx). */
  icon?: IconName
  /** Draw the icon smaller or larger than usual (e.g. dog sizes). */
  iconScale?: number
  blurb?: string
  /** Multi-select only: picking this clears the others (and vice versa). */
  exclusive?: boolean
}

export const ENERGY_OPTIONS: Option<SocialEnergy>[] = [
  { value: 'introvert', icon: 'moon', label: 'Quiet charger', blurb: 'I warm up slowly and love deep one-on-one chats.' },
  { value: 'ambivert', icon: 'half-moon', label: 'Bit of both', blurb: 'Depends on the day, the people and the coffee.' },
  { value: 'extrovert', icon: 'sun', label: 'Social sparkler', blurb: 'New faces give me energy. Let’s talk!' },
]

export const NEW_PEOPLE_OPTIONS: Option<NewPeopleComfort>[] = [
  { value: 'love-it', icon: 'party', label: 'Love it', blurb: 'Strangers are just friends I haven’t met.' },
  { value: 'warm-up', icon: 'smile', label: 'Give me a minute', blurb: 'Happy to, once the ice is broken.' },
  { value: 'familiar-first', icon: 'heart', label: 'Small steps', blurb: 'I’m trying it out. Go gently.' },
]

export const PLANNING_OPTIONS: Option<PlanningStyle>[] = [
  { value: 'planner', icon: 'clipboard', label: 'Every stop planned', blurb: 'Spreadsheets, bookings, a backup plan.' },
  { value: 'loose-plan', icon: 'compass', label: 'Loose outline', blurb: 'A few anchors, lots of room to roam.' },
  { value: 'spontaneous', icon: 'dice', label: 'Wherever the day goes', blurb: 'Plans? I follow my nose.' },
]

export const DECISION_OPTIONS: Option<DecisionStyle>[] = [
  { value: 'lead', icon: 'flag', label: 'I’ll lead the way', blurb: 'Happy to pick the next stop.' },
  { value: 'together', icon: 'venn', label: 'Let’s decide together', blurb: 'Two heads, better detours.' },
  { value: 'follow', icon: 'backpack', label: 'Show me around', blurb: 'I love following someone’s lead.' },
]

export const INTEREST_OPTIONS: Option<Interest>[] = [
  { value: 'history', icon: 'columns', label: 'History & culture' },
  { value: 'food', icon: 'bowl', label: 'Food & gastronomy' },
  { value: 'architecture', icon: 'buildings', label: 'Architecture' },
  { value: 'art', icon: 'palette', label: 'Art & museums' },
  { value: 'music', icon: 'note', label: 'Music' },
  { value: 'sports', icon: 'ball', label: 'Sports' },
  { value: 'nature', icon: 'tree', label: 'Nature & outdoors' },
  { value: 'photography', icon: 'camera', label: 'Photography' },
  { value: 'technology', icon: 'bulb', label: 'Technology' },
  { value: 'nightlife', icon: 'moon', label: 'Nightlife' },
  { value: 'shopping', icon: 'bag', label: 'Shopping' },
  { value: 'traditions', icon: 'lantern', label: 'Local communities & traditions' },
]

export const QUALITY_OPTIONS: Option<CompanionQuality>[] = [
  { value: 'curious', icon: 'search', label: 'Curious' },
  { value: 'funny', icon: 'grin', label: 'Funny' },
  { value: 'easygoing', icon: 'wave', label: 'Easygoing' },
  { value: 'knowledgeable', icon: 'book', label: 'Knows their stuff' },
  { value: 'adventurous', icon: 'mountain', label: 'Adventurous' },
  { value: 'good-listener', icon: 'ear', label: 'Good listener' },
  { value: 'chatty', icon: 'chat', label: 'Chatty' },
  { value: 'calm', icon: 'leaf', label: 'Calm' },
  { value: 'punctual', icon: 'clock', label: 'On time' },
  { value: 'respectful', icon: 'shield', label: 'Respects boundaries' },
]
export { MAX_RANKED_QUALITIES as MAX_QUALITIES } from './matchingConfig'

export const ADVENTURE_OPTIONS: Option<AdventureIdea>[] = [
  { value: 'wander', icon: 'cup', label: 'Coffee & a long wander', blurb: 'No agenda, good conversation.' },
  { value: 'food-crawl', icon: 'bowl', label: 'A tasting crawl', blurb: 'Five snacks, three neighbourhoods.' },
  { value: 'culture-hop', icon: 'frame', label: 'Museum & gallery hop', blurb: 'Art, history, a gift-shop stop.' },
  { value: 'outdoors', icon: 'sunset', label: 'Sunset lookout', blurb: 'A climb, a view, a picnic.' },
  { value: 'night-out', icon: 'note', label: 'Live music night', blurb: 'A gig, a dance floor, a late snack.' },
  { value: 'local-life', icon: 'basket', label: 'Live like a local', blurb: 'Markets, parks, the corner café.' },
]
export const NOTE_MAX_LENGTH = 200

export const TOPIC_OPTIONS: Option<Topic>[] = [
  { value: 'travel', icon: 'plane', label: 'Travel stories' },
  { value: 'food', icon: 'bowl', label: 'Food & cooking' },
  { value: 'books-film', icon: 'film', label: 'Books & film' },
  { value: 'music', icon: 'headphones', label: 'Music' },
  { value: 'sports', icon: 'ball', label: 'Sports' },
  { value: 'tech', icon: 'chip', label: 'Tech & science' },
  { value: 'history', icon: 'scroll', label: 'History' },
  { value: 'art-design', icon: 'pencil', label: 'Art & design' },
  { value: 'nature', icon: 'globe', label: 'Nature & the planet' },
  { value: 'languages', icon: 'chats', label: 'Languages' },
  { value: 'games', icon: 'gamepad', label: 'Games' },
  { value: 'careers', icon: 'briefcase', label: 'Work & big ideas' },
]

export const BUDGET_OPTIONS: Option<BudgetLevel>[] = [
  { value: 'free', icon: 'tag', label: 'Free stuff only', blurb: 'Parks, views, street art.' },
  { value: 'budget', icon: 'coins', label: 'Budget-friendly', blurb: 'A coffee here, a snack there.' },
  { value: 'moderate', icon: 'banknote', label: 'Moderate', blurb: 'Happy to pay for good things.' },
  { value: 'comfortable', icon: 'card', label: 'Comfortable', blurb: 'Nice meals, tickets, taxis.' },
  { value: 'luxury', icon: 'gem', label: 'Treat yourself', blurb: 'Tasting menus and VIP passes.' },
]

export const CURRENCIES: Currency[] = ['CAD', 'USD', 'EUR', 'GBP', 'MXN', 'JPY', 'AUD', 'INR']
export const SPEND_MAX = 100_000

export const PACE_OPTIONS: Option<Pace>[] = [
  { value: 'relaxed', icon: 'cup', label: 'Relaxed', blurb: 'Take my time and enjoy a few places.' },
  { value: 'balanced', icon: 'scale', label: 'Balanced', blurb: 'A mix of activities and downtime.' },
  { value: 'fast', icon: 'bolt', label: 'Fast-paced', blurb: 'See as much as possible.' },
  { value: 'spontaneous', icon: 'kite', label: 'Spontaneous', blurb: 'Discover things as I go.' },
]

export const ATTRACTION_OPTIONS: Option<Attraction>[] = [
  { value: 'landmarks', icon: 'tower', label: 'Famous landmarks' },
  { value: 'hidden-gems', icon: 'gem', label: 'Hidden gems' },
  { value: 'historical', icon: 'castle', label: 'Historical spots' },
  { value: 'museums', icon: 'frame', label: 'Museums & galleries' },
  { value: 'nature', icon: 'tree', label: 'Nature & parks' },
  { value: 'food-spots', icon: 'bowl', label: 'Food markets & restaurants' },
  { value: 'shopping', icon: 'bag', label: 'Shopping districts' },
  { value: 'nightlife', icon: 'wine', label: 'Nightlife' },
  { value: 'sports', icon: 'bike', label: 'Sports & recreation' },
  { value: 'cultural', icon: 'mask', label: 'Cultural experiences' },
  { value: 'photo-spots', icon: 'camera', label: 'Photo spots' },
]

export const FOOD_STYLE_OPTIONS: Option<FoodStyle>[] = [
  { value: 'street-food', icon: 'cart', label: 'Street food' },
  { value: 'local-specialties', icon: 'star', label: 'Local specialties' },
  { value: 'restaurants-cafes', icon: 'cup', label: 'Restaurants & cafés' },
  { value: 'fine-dining', icon: 'wine', label: 'Fine dining' },
  { value: 'food-markets', icon: 'basket', label: 'Food markets' },
]

export const DIETARY_OPTIONS: Option<Dietary>[] = [
  { value: 'vegetarian', icon: 'carrot', label: 'Vegetarian' },
  { value: 'vegan', icon: 'sprout', label: 'Vegan' },
  { value: 'halal', icon: 'seal', label: 'Halal' },
  { value: 'kosher', icon: 'seal', label: 'Kosher' },
  { value: 'gluten-free', icon: 'wheat', label: 'Gluten-free' },
  { value: 'dairy-free', icon: 'milk', label: 'Dairy-free' },
  { value: 'nut-free', icon: 'nut', label: 'Nut allergy' },
]

export const TRANSPORT_OPTIONS: Option<Transport>[] = [
  { value: 'walking', icon: 'shoe', label: 'Walking' },
  { value: 'transit', icon: 'train', label: 'Public transport' },
  { value: 'cycling', icon: 'bike', label: 'Cycling' },
  { value: 'driving', icon: 'car', label: 'Driving' },
  { value: 'flexible', icon: 'shuffle', label: 'Whatever works', exclusive: true },
]

export const GROUP_OPTIONS: Option<GroupSize>[] = [
  { value: 'one-on-one', icon: 'people2', label: 'Just one companion', blurb: 'Easier to really get to know someone.' },
  { value: 'small-group', icon: 'people3', label: 'A small group', blurb: 'Three to five feels right.' },
  { value: 'large-group', icon: 'party', label: 'The more the merrier', blurb: 'Big groups, big energy.' },
  { value: 'no-preference', icon: 'shuffle', label: 'No preference', blurb: 'I’m happy either way.' },
]

/** Common picks first, including sign languages. People can add any other language. */
export const LANGUAGE_OPTIONS = [
  'English',
  'French',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Arabic',
  'Hindi',
  'Portuguese',
  'German',
  'Italian',
  'Japanese',
  'Korean',
  'Russian',
  'Turkish',
  'Vietnamese',
  'Tagalog',
  'Persian',
  'Punjabi',
  'ASL',
  'LSQ',
] as const
export const LANGUAGE_MAX_LENGTH = 30

export const ACCESSIBILITY_OPTIONS: Option<AccessibilityNeed>[] = [
  { value: 'step-free', icon: 'ramp', label: 'Step-free access' },
  { value: 'wheelchair', icon: 'wheelchair', label: 'Wheelchair-accessible places' },
  { value: 'accessible-transit', icon: 'bus', label: 'Accessible public transport' },
  { value: 'quiet', icon: 'mute', label: 'Quieter environments' },
  { value: 'rest-stops', icon: 'bench', label: 'Places to sit and rest' },
]

export const COMPANION_OPTIONS: Option<TravelCompanions>[] = [
  { value: 'solo', icon: 'user', label: 'Just me' },
  { value: 'partner', icon: 'heart', label: 'With a partner' },
  { value: 'friends', icon: 'people2', label: 'With friends' },
  { value: 'family', icon: 'people3', label: 'With family' },
]
export const MAX_COMPANIONS = 15

export const HOST_ACTIVITY_OPTIONS: Option<HostActivity>[] = [
  { value: 'walking-tour', icon: 'shoe', label: 'Neighbourhood walks' },
  { value: 'food-crawl', icon: 'bowl', label: 'Food crawls' },
  { value: 'coffee-chat', icon: 'cup', label: 'Coffee & a chat' },
  { value: 'museums', icon: 'columns', label: 'Museum visits' },
  { value: 'outdoors', icon: 'mountain', label: 'Parks & hikes' },
  { value: 'photo-walk', icon: 'camera', label: 'Photo walks' },
  { value: 'nightlife', icon: 'moon', label: 'Nights out' },
  { value: 'markets', icon: 'basket', label: 'Markets & shopping' },
  { value: 'sports', icon: 'ball', label: 'Games & sports' },
  { value: 'cultural-events', icon: 'mask', label: 'Festivals & events' },
]

export const AVAILABILITY_OPTIONS: Option<Availability>[] = [
  { value: 'weekday-day', icon: 'sun-cloud', label: 'Weekday daytime' },
  { value: 'weekday-evening', icon: 'sunset', label: 'Weekday evenings' },
  { value: 'weekend-day', icon: 'sun', label: 'Weekend daytime' },
  { value: 'weekend-evening', icon: 'moon', label: 'Weekend evenings' },
]

export const DURATION_OPTIONS: Option<HostDuration>[] = [
  { value: 'quick', icon: 'stopwatch', label: 'About an hour' },
  { value: 'couple-hours', icon: 'clock', label: 'Two or three hours' },
  { value: 'half-day', icon: 'half-circle', label: 'Half a day' },
  { value: 'full-day', icon: 'full-circle', label: 'A full day' },
]


// ---- Four-legged amigos (universal questionnaire) ----

export const DOG_STANCE_OPTIONS: Option<DogStance>[] = [
  { value: 'has-dog', icon: 'dog', label: 'Yes, I have a dog', blurb: 'They might even tag along.' },
  { value: 'loves-dogs', icon: 'bone', label: 'No dog, but I love them', blurb: 'Happy to hang out with someone’s pup.' },
  { value: 'neutral', icon: 'tilde', label: 'Neutral', blurb: 'Dogs or no dogs, either’s fine.' },
  { value: 'no-dogs', icon: 'no', label: 'I’d rather not', blurb: 'Private. We just won’t pair you with dog owners.' },
]

export const DOG_SIZE_OPTIONS: Option<DogSize>[] = [
  { value: 'small', icon: 'dog', iconScale: 0.7, label: 'Small' },
  { value: 'medium', icon: 'dog', label: 'Medium' },
  { value: 'large', icon: 'dog', iconScale: 1.3, label: 'Large' },
]

export const DOG_VIBE_OPTIONS: Option<DogVibe>[] = [
  { value: 'chill', icon: 'leaf', label: 'Chill' },
  { value: 'playful', icon: 'ball', label: 'Playful' },
  { value: 'learning', icon: 'book', label: 'Still learning' },
]

export const DOG_SOCIAL_OPTIONS: Option<DogSociability>[] = [
  { value: 'yes', icon: 'thumbs', label: 'Yes' },
  { value: 'sometimes', icon: 'tilde', label: 'Sometimes' },
  { value: 'no', icon: 'hand-stop', label: 'Not really' },
]

export const DOG_NAME_MAX_LENGTH = 30

export const CITY_MAX_LENGTH = 60
export const MAX_CITIES = 100
export const AREA_MAX_LENGTH = 40
export const MAX_AREAS = 8
export const GEMS_MAX_LENGTH = 300

/** "Food & gastronomy" for a value, or the raw value if it's unknown (e.g. data from an older version). */
export function labelFor<T extends string>(options: Option<T>[], value: T | null | undefined): string {
  if (!value) return ''
  return options.find((o) => o.value === value)?.label ?? value
}

export function labelsFor<T extends string>(options: Option<T>[], values: readonly T[]): string[] {
  return values.map((v) => labelFor(options, v))
}

export function optionFor<T extends string>(options: Option<T>[], value: T | null | undefined) {
  return value ? options.find((o) => o.value === value) : undefined
}
