// Every answer option shown in the questionnaire, the mode setups and the profile summary.
// Values are stable ids (stored); labels are copy (safe to reword).
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
  DogPreference,
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
  emoji?: string
  blurb?: string
  /** Multi-select only: picking this clears the others (and vice versa). */
  exclusive?: boolean
}

export const ENERGY_OPTIONS: Option<SocialEnergy>[] = [
  { value: 'introvert', emoji: '🌙', label: 'Quiet charger', blurb: 'I warm up slowly and love deep one-on-one chats.' },
  { value: 'ambivert', emoji: '🌗', label: 'Bit of both', blurb: 'Depends on the day, the people and the coffee.' },
  { value: 'extrovert', emoji: '☀️', label: 'Social sparkler', blurb: 'New faces give me energy. Let’s talk!' },
]

export const NEW_PEOPLE_OPTIONS: Option<NewPeopleComfort>[] = [
  { value: 'love-it', emoji: '🙌', label: 'Love it', blurb: 'Strangers are just friends I haven’t met.' },
  { value: 'warm-up', emoji: '🙂', label: 'Give me a minute', blurb: 'Happy to, once the ice is broken.' },
  { value: 'familiar-first', emoji: '🫶', label: 'Small steps', blurb: 'I’m trying it out. Go gently.' },
]

export const PLANNING_OPTIONS: Option<PlanningStyle>[] = [
  { value: 'planner', emoji: '🗂️', label: 'Every stop planned', blurb: 'Spreadsheets, bookings, a backup plan.' },
  { value: 'loose-plan', emoji: '🧭', label: 'Loose outline', blurb: 'A few anchors, lots of room to roam.' },
  { value: 'spontaneous', emoji: '🎲', label: 'Wherever the day goes', blurb: 'Plans? I follow my nose.' },
]

export const DECISION_OPTIONS: Option<DecisionStyle>[] = [
  { value: 'lead', emoji: '🚩', label: 'I’ll lead the way', blurb: 'Happy to pick the next stop.' },
  { value: 'together', emoji: '🤝', label: 'Let’s decide together', blurb: 'Two heads, better detours.' },
  { value: 'follow', emoji: '🎒', label: 'Show me around', blurb: 'I love following someone’s lead.' },
]

export const INTEREST_OPTIONS: Option<Interest>[] = [
  { value: 'history', emoji: '🏛️', label: 'History & culture' },
  { value: 'food', emoji: '🍜', label: 'Food & gastronomy' },
  { value: 'architecture', emoji: '🏙️', label: 'Architecture' },
  { value: 'art', emoji: '🎨', label: 'Art & museums' },
  { value: 'music', emoji: '🎵', label: 'Music' },
  { value: 'sports', emoji: '⚽', label: 'Sports' },
  { value: 'nature', emoji: '🌲', label: 'Nature & outdoors' },
  { value: 'photography', emoji: '📷', label: 'Photography' },
  { value: 'technology', emoji: '💡', label: 'Technology' },
  { value: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { value: 'traditions', emoji: '🪅', label: 'Local communities & traditions' },
]

export const QUALITY_OPTIONS: Option<CompanionQuality>[] = [
  { value: 'curious', emoji: '🔍', label: 'Curious' },
  { value: 'funny', emoji: '😄', label: 'Funny' },
  { value: 'easygoing', emoji: '🌊', label: 'Easygoing' },
  { value: 'knowledgeable', emoji: '📚', label: 'Knows their stuff' },
  { value: 'adventurous', emoji: '🧗', label: 'Adventurous' },
  { value: 'good-listener', emoji: '👂', label: 'Good listener' },
  { value: 'chatty', emoji: '💬', label: 'Chatty' },
  { value: 'calm', emoji: '🍃', label: 'Calm' },
  { value: 'punctual', emoji: '⏰', label: 'On time' },
  { value: 'respectful', emoji: '🙏', label: 'Respects boundaries' },
]
export const MAX_QUALITIES = 3

export const ADVENTURE_OPTIONS: Option<AdventureIdea>[] = [
  { value: 'wander', emoji: '☕', label: 'Coffee & a long wander', blurb: 'No agenda, good conversation.' },
  { value: 'food-crawl', emoji: '🥟', label: 'A tasting crawl', blurb: 'Five snacks, three neighbourhoods.' },
  { value: 'culture-hop', emoji: '🖼️', label: 'Museum & gallery hop', blurb: 'Art, history, a gift-shop stop.' },
  { value: 'outdoors', emoji: '🌄', label: 'Sunset lookout', blurb: 'A climb, a view, a picnic.' },
  { value: 'night-out', emoji: '🎶', label: 'Live music night', blurb: 'A gig, a dance floor, a late snack.' },
  { value: 'local-life', emoji: '🧺', label: 'Live like a local', blurb: 'Markets, parks, the corner café.' },
]
export const NOTE_MAX_LENGTH = 200

export const TOPIC_OPTIONS: Option<Topic>[] = [
  { value: 'travel', emoji: '✈️', label: 'Travel stories' },
  { value: 'food', emoji: '🍳', label: 'Food & cooking' },
  { value: 'books-film', emoji: '🎬', label: 'Books & film' },
  { value: 'music', emoji: '🎧', label: 'Music' },
  { value: 'sports', emoji: '🏀', label: 'Sports' },
  { value: 'tech', emoji: '🤖', label: 'Tech & science' },
  { value: 'history', emoji: '📜', label: 'History' },
  { value: 'art-design', emoji: '✏️', label: 'Art & design' },
  { value: 'nature', emoji: '🌍', label: 'Nature & the planet' },
  { value: 'languages', emoji: '🗣️', label: 'Languages' },
  { value: 'games', emoji: '🎮', label: 'Games' },
  { value: 'careers', emoji: '💼', label: 'Work & big ideas' },
]

export const BUDGET_OPTIONS: Option<BudgetLevel>[] = [
  { value: 'free', emoji: '🆓', label: 'Free stuff only', blurb: 'Parks, views, street art.' },
  { value: 'budget', emoji: '🪙', label: 'Budget-friendly', blurb: 'A coffee here, a snack there.' },
  { value: 'moderate', emoji: '💵', label: 'Moderate', blurb: 'Happy to pay for good things.' },
  { value: 'comfortable', emoji: '💳', label: 'Comfortable', blurb: 'Nice meals, tickets, taxis.' },
  { value: 'luxury', emoji: '💎', label: 'Treat yourself', blurb: 'Tasting menus and VIP passes.' },
]

export const CURRENCIES: Currency[] = ['CAD', 'USD', 'EUR', 'GBP', 'MXN', 'JPY', 'AUD', 'INR']
export const SPEND_MAX = 100_000

export const PACE_OPTIONS: Option<Pace>[] = [
  { value: 'relaxed', emoji: '🐢', label: 'Relaxed', blurb: 'Take my time and enjoy a few places.' },
  { value: 'balanced', emoji: '⚖️', label: 'Balanced', blurb: 'A mix of activities and downtime.' },
  { value: 'fast', emoji: '🐇', label: 'Fast-paced', blurb: 'See as much as possible.' },
  { value: 'spontaneous', emoji: '🪁', label: 'Spontaneous', blurb: 'Discover things as I go.' },
]

export const ATTRACTION_OPTIONS: Option<Attraction>[] = [
  { value: 'landmarks', emoji: '🗼', label: 'Famous landmarks' },
  { value: 'hidden-gems', emoji: '💎', label: 'Hidden gems' },
  { value: 'historical', emoji: '🏰', label: 'Historical spots' },
  { value: 'museums', emoji: '🖼️', label: 'Museums & galleries' },
  { value: 'nature', emoji: '🌳', label: 'Nature & parks' },
  { value: 'food-spots', emoji: '🥐', label: 'Food markets & restaurants' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping districts' },
  { value: 'nightlife', emoji: '🍸', label: 'Nightlife' },
  { value: 'sports', emoji: '🚴', label: 'Sports & recreation' },
  { value: 'cultural', emoji: '🎭', label: 'Cultural experiences' },
  { value: 'photo-spots', emoji: '📸', label: 'Photo spots' },
]

export const FOOD_STYLE_OPTIONS: Option<FoodStyle>[] = [
  { value: 'street-food', emoji: '🌮', label: 'Street food' },
  { value: 'local-specialties', emoji: '🥯', label: 'Local specialties' },
  { value: 'restaurants-cafes', emoji: '☕', label: 'Restaurants & cafés' },
  { value: 'fine-dining', emoji: '🍷', label: 'Fine dining' },
  { value: 'food-markets', emoji: '🧺', label: 'Food markets' },
]

export const DIETARY_OPTIONS: Option<Dietary>[] = [
  { value: 'vegetarian', emoji: '🥕', label: 'Vegetarian' },
  { value: 'vegan', emoji: '🌱', label: 'Vegan' },
  { value: 'halal', emoji: '☪️', label: 'Halal' },
  { value: 'kosher', emoji: '✡️', label: 'Kosher' },
  { value: 'gluten-free', emoji: '🌾', label: 'Gluten-free' },
  { value: 'dairy-free', emoji: '🥛', label: 'Dairy-free' },
  { value: 'nut-free', emoji: '🥜', label: 'Nut allergy' },
]

export const TRANSPORT_OPTIONS: Option<Transport>[] = [
  { value: 'walking', emoji: '👟', label: 'Walking' },
  { value: 'transit', emoji: '🚇', label: 'Public transport' },
  { value: 'cycling', emoji: '🚲', label: 'Cycling' },
  { value: 'driving', emoji: '🚗', label: 'Driving' },
  { value: 'flexible', emoji: '🤷', label: 'Whatever works', exclusive: true },
]

export const GROUP_OPTIONS: Option<GroupSize>[] = [
  { value: 'one-on-one', emoji: '👯', label: 'Just one companion', blurb: 'Easier to really get to know someone.' },
  { value: 'small-group', emoji: '👨‍👩‍👧', label: 'A small group', blurb: 'Three to five feels right.' },
  { value: 'large-group', emoji: '🎉', label: 'The more the merrier', blurb: 'Big groups, big energy.' },
  { value: 'no-preference', emoji: '🌀', label: 'No preference', blurb: 'I’m happy either way.' },
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
  { value: 'step-free', emoji: '🛗', label: 'Step-free access' },
  { value: 'wheelchair', emoji: '♿', label: 'Wheelchair-accessible places' },
  { value: 'accessible-transit', emoji: '🚌', label: 'Accessible public transport' },
  { value: 'quiet', emoji: '🤫', label: 'Quieter environments' },
  { value: 'rest-stops', emoji: '🪑', label: 'Places to sit and rest' },
]

export const COMPANION_OPTIONS: Option<TravelCompanions>[] = [
  { value: 'solo', emoji: '🧍', label: 'Just me' },
  { value: 'partner', emoji: '💞', label: 'With a partner' },
  { value: 'friends', emoji: '👯', label: 'With friends' },
  { value: 'family', emoji: '👨‍👩‍👧', label: 'With family' },
]
export const MAX_COMPANIONS = 15

export const HOST_ACTIVITY_OPTIONS: Option<HostActivity>[] = [
  { value: 'walking-tour', emoji: '🚶', label: 'Neighbourhood walks' },
  { value: 'food-crawl', emoji: '🥯', label: 'Food crawls' },
  { value: 'coffee-chat', emoji: '☕', label: 'Coffee & a chat' },
  { value: 'museums', emoji: '🏛️', label: 'Museum visits' },
  { value: 'outdoors', emoji: '⛰️', label: 'Parks & hikes' },
  { value: 'photo-walk', emoji: '📸', label: 'Photo walks' },
  { value: 'nightlife', emoji: '🌃', label: 'Nights out' },
  { value: 'markets', emoji: '🧺', label: 'Markets & shopping' },
  { value: 'sports', emoji: '🏒', label: 'Games & sports' },
  { value: 'cultural-events', emoji: '🎭', label: 'Festivals & events' },
]

export const AVAILABILITY_OPTIONS: Option<Availability>[] = [
  { value: 'weekday-day', emoji: '🌤️', label: 'Weekday daytime' },
  { value: 'weekday-evening', emoji: '🌆', label: 'Weekday evenings' },
  { value: 'weekend-day', emoji: '☀️', label: 'Weekend daytime' },
  { value: 'weekend-evening', emoji: '🌙', label: 'Weekend evenings' },
]

export const DURATION_OPTIONS: Option<HostDuration>[] = [
  { value: 'quick', emoji: '⏱️', label: 'About an hour' },
  { value: 'couple-hours', emoji: '🕑', label: 'Two or three hours' },
  { value: 'half-day', emoji: '🌓', label: 'Half a day' },
  { value: 'full-day', emoji: '🌕', label: 'A full day' },
]

export const DOG_OPTIONS: Option<DogPreference>[] = [
  { value: 'bring-my-dog', emoji: '🐕', label: 'Yes! My dog’s coming', blurb: 'Dog park challenges, please.' },
  { value: 'love-dogs', emoji: '🦴', label: 'No dog, but I love them', blurb: 'Happy to tag along to dog-friendly spots.' },
  { value: 'no-dogs', emoji: '🙅', label: 'I’d rather skip', blurb: 'No dog activities for me.' },
]

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
