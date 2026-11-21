// Mock data for the demo. Only src/lib/api.ts may import this file.
import type { Hunt, Team, User } from './types'

export type { Hunt, Role, Team, User } from './types'

// Coordinates are approximate: verify each in Google Maps before the demo.
// Photos are placeholders until real ones are added to public/assets/hunts/.
export const HUNTS: Hunt[] = [
  {
    id: 'roddick-gates',
    title: 'Roddick Gates',
    photo: '/assets/hunts/roddick-gates.jpg',
    lat: 45.5048,
    lng: -73.5772,
    timeLimitSec: 10 * 60,
    basePoints: 100,
    difficulty: 'easy',
    revealText:
      "These are the Roddick Gates, McGill's main entrance on Sherbrooke Street, built in 1925 in memory of Sir Thomas Roddick.",
  },
  {
    id: 'three-bares',
    title: 'The Three Bares (McGill campus)',
    photo: '/assets/hunts/three-bares.jpg',
    lat: 45.5045,
    lng: -73.578,
    timeLimitSec: 10 * 60,
    basePoints: 150,
    difficulty: 'medium',
    revealText:
      'This fountain sculpture on lower campus has been nicknamed "The Three Bares" by generations of McGill students.',
  },
  {
    id: 'leonard-cohen-mural',
    title: 'Leonard Cohen mural',
    photo: '/assets/hunts/leonard-cohen-mural.jpg',
    lat: 45.4986,
    lng: -73.5783,
    timeLimitSec: 15 * 60,
    basePoints: 200,
    difficulty: 'medium',
    revealText:
      'This giant portrait of Montreal-born poet and singer Leonard Cohen towers over Crescent Street, many storeys tall.',
  },
  {
    id: 'kondiaronk',
    title: 'Kondiaronk Belvedere',
    photo: '/assets/hunts/kondiaronk.jpg',
    lat: 45.504,
    lng: -73.5874,
    timeLimitSec: 25 * 60,
    basePoints: 300,
    difficulty: 'hard',
    revealText:
      'The Kondiaronk Belvedere on Mount Royal is named after the Wendat chief who helped bring about the Great Peace of Montreal in 1701.',
  },
  {
    id: 'place-des-arts',
    title: 'Place des Arts fountains',
    photo: '/assets/hunts/place-des-arts.jpg',
    lat: 45.5085,
    lng: -73.5665,
    timeLimitSec: 15 * 60,
    basePoints: 200,
    difficulty: 'medium',
    revealText:
      "Place des Arts is the heart of the Quartier des spectacles, Montreal's festival district, and its fountains are a summer favourite.",
  },
  {
    id: 'cartier-monument',
    title: 'George-Étienne Cartier Monument',
    photo: '/assets/hunts/cartier-monument.jpg',
    lat: 45.5144,
    lng: -73.5866,
    timeLimitSec: 20 * 60,
    basePoints: 250,
    difficulty: 'hard',
    revealText:
      "The Cartier Monument at the foot of Mount Royal is home to the Sunday Tam-Tams, the city's famous open-air drum circle.",
  },
]

// The pool partners are matched from: 3 tourists, 3 locals.
export const USERS: User[] = [
  { id: 'u-ana', name: 'Ana', avatar: '🦜', role: 'tourist', funFact: 'Flew in from Lisbon and has never seen snow.', interests: ['food', 'architecture', 'photography'], languages: ['Portuguese', 'English', 'Spanish'] },
  { id: 'u-kenji', name: 'Kenji', avatar: '🐙', role: 'tourist', funFact: 'Collects a postcard from every city he visits.', interests: ['art', 'history', 'technology'], languages: ['Japanese', 'English'] },
  { id: 'u-priya', name: 'Priya', avatar: '🦒', role: 'tourist', funFact: 'Is here for one weekend and wants to see everything.', interests: ['nightlife', 'music', 'shopping', 'food'], languages: ['English', 'Hindi'] },
  { id: 'u-marc', name: 'Marc', avatar: '🦫', role: 'local', funFact: 'Knows every bagel shop in Mile End by smell.', interests: ['food', 'traditions', 'music'], languages: ['French', 'English'] },
  { id: 'u-sophie', name: 'Sophie', avatar: '🐿️', role: 'local', funFact: 'Has climbed Mount Royal more than 200 times.', interests: ['nature', 'photography', 'sports'], languages: ['French', 'English', 'Spanish'] },
  { id: 'u-yasmine', name: 'Yasmine', avatar: '🦔', role: 'local', funFact: 'Plays drums at the Tam-Tams most Sundays.', interests: ['music', 'art', 'nightlife', 'history'], languages: ['Arabic', 'French', 'English'] },
]

const person = (id: string, name: string, avatar: string, role: User['role']): User => ({ id, name, avatar, role })

// Seeded so the leaderboard is never empty.
export const TEAMS: Team[] = [
  {
    id: 't-bagels',
    name: 'Bagel Bandits',
    members: [person('m1', 'Léa', '🥯', 'local'), person('m2', 'Tom', '🐻', 'tourist')],
    points: 820,
    completedHuntIds: ['roddick-gates', 'three-bares', 'kondiaronk', 'place-des-arts'],
  },
  {
    id: 't-poutine',
    name: 'Poutine Patrol',
    members: [person('m3', 'Olivier', '🦆', 'local'), person('m4', 'Mia', '🐨', 'tourist')],
    points: 610,
    completedHuntIds: ['leonard-cohen-mural', 'cartier-monument', 'roddick-gates'],
  },
  {
    id: 't-mountain',
    name: 'Mountain Goats',
    members: [person('m5', 'Camille', '🐐', 'local'), person('m6', 'Diego', '🦩', 'tourist')],
    points: 455,
    completedHuntIds: ['kondiaronk', 'three-bares'],
  },
  {
    id: 't-metro',
    name: 'Metro Gnomes',
    members: [person('m7', 'Nadia', '🍄', 'local'), person('m8', 'Sam', '🐢', 'tourist')],
    points: 240,
    completedHuntIds: ['place-des-arts'],
  },
  {
    id: 't-maple',
    name: 'Maple Mavericks',
    members: [person('m9', 'Félix', '🍁', 'local'), person('m10', 'Hana', '🐧', 'tourist')],
    points: 130,
    completedHuntIds: ['roddick-gates'],
  },
]
