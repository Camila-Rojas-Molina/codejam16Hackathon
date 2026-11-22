// Shop backdrops: the scene drawn behind the avatar. Plain data (no React), so the economy seed
// generator can read it. Artwork: components/illustrations/backdrops/ (keyed by `art`, else the id).
//
// Ids are saved in accounts (owned + equipped): never rename or delete one, set `retired: true`.
// The first three ids are the original backdrops and must stay. Prices sit inside
// BACKDROP_PRICE_BANDS: standard = simple patterns and scenes, detailed = full illustrated scenes,
// premium = the most elaborate scenes, most with a subtle animation (off under reduced motion).
import type { BackdropDef } from '../../economy/types'

type Entry = Omit<BackdropDef, 'kind' | 'slot'>

const ENTRIES: Entry[] = [
  // ---- standard ----
  { id: 'backdrop-tiles', name: 'Café tiles', description: 'Teal checks, like a corner bistro floor.', tier: 'standard', price: 500, theme: 'abstract' },
  { id: 'backdrop-gingham', name: 'Picnic gingham', description: 'A red-check blanket, ready for the park.', tier: 'standard', price: 500, theme: 'abstract' },
  { id: 'backdrop-sunburst', name: 'Sunburst', description: 'A café-poster burst of sunshine behind you.', tier: 'standard', price: 600, theme: 'abstract' },
  { id: 'backdrop-memphis', name: 'Memphis party', description: 'Squiggles, confetti and bold shapes, straight out of the eighties.', tier: 'standard', price: 700, theme: 'abstract' },
  { id: 'backdrop-sunset', name: 'Golden hour', description: 'That evening glow over the river.', tier: 'standard', price: 750, theme: 'nature' },
  { id: 'backdrop-bauhaus', name: 'Bauhaus blocks', description: 'Quarter circles and primary blocks, gallery-poster style.', tier: 'standard', price: 850, theme: 'abstract' },
  { id: 'backdrop-groovy', name: 'Groovy rings', description: 'Wavy seventies rings in sunset colours.', tier: 'standard', price: 900, theme: 'abstract' },
  // ---- detailed ----
  { id: 'backdrop-pastel-dream', name: 'Pastel dreamland', description: 'Candy hills, soft clouds and a little rainbow.', tier: 'detailed', price: 1000, theme: 'nature' },
  { id: 'backdrop-forest', name: 'Pine forest', description: 'Misty layers of pines, with mushrooms underfoot.', tier: 'detailed', price: 1000, theme: 'nature' },
  { id: 'backdrop-mountains', name: 'Mountain range', description: 'Snowy peaks over a quiet alpine lake.', tier: 'detailed', price: 1100, theme: 'nature' },
  { id: 'backdrop-retro-sunset', name: 'Retro sunset', description: 'A striped seventies sun sinking behind the ridges.', tier: 'detailed', price: 1200, theme: 'nature' },
  { id: 'backdrop-autumn', name: 'Autumn leaves', description: 'Maple reds and golds, leaves drifting down.', tier: 'detailed', price: 1200, theme: 'seasonal' },
  { id: 'backdrop-spring-blossom', name: 'Spring blossoms', description: 'Cherry branches in bloom and tulips in the grass.', tier: 'detailed', price: 1300, theme: 'seasonal' },
  { id: 'backdrop-desert-road', name: 'Desert road', description: 'An open road between the mesas. Cacti optional.', tier: 'detailed', price: 1300, theme: 'travel' },
  { id: 'backdrop-beach', name: 'Tropical beach', description: 'Palms, warm sand and a sail on the horizon.', tier: 'detailed', price: 1400, theme: 'sea' },
  { id: 'backdrop-skyline', name: 'City skyline', description: 'Downtown towers lighting up at dusk.', tier: 'detailed', price: 1400, theme: 'city' },
  { id: 'backdrop-postcard', name: 'Travel postcard', description: 'Airmail stripes, a perforated stamp and a fresh postmark.', tier: 'detailed', price: 1500, theme: 'travel' },
  { id: 'backdrop-greenhouse', name: 'Greenhouse', description: 'A glasshouse full of monsteras, ferns and hanging pots.', tier: 'detailed', price: 1600, theme: 'nature' },
  { id: 'backdrop-lighthouse', name: 'Lighthouse coast', description: 'A striped lighthouse keeping watch over the waves.', tier: 'detailed', price: 1700, theme: 'sea' },
  { id: 'backdrop-cafe-street', name: 'Café street', description: 'Striped awnings, terrace tables and string lights.', tier: 'detailed', price: 1800, theme: 'city' },
  // ---- premium ----
  { id: 'backdrop-montreal', name: 'Montréal rooftops', description: 'Plateau spiral staircases with Mount Royal behind.', tier: 'premium', price: 2000, theme: 'city' },
  { id: 'backdrop-starry-night', name: 'Starry night', description: 'Twinkling stars and a crescent moon over a sleepy town.', tier: 'premium', price: 2200, theme: 'night' },
  { id: 'backdrop-snowy-village', name: 'Snowy village', description: 'Snow falling softly on warm-lit cottages.', tier: 'premium', price: 2400, theme: 'seasonal' },
  { id: 'backdrop-balloons', name: 'Hot-air balloons', description: 'Balloons floating over patchwork fields.', tier: 'premium', price: 2500, theme: 'travel' },
  { id: 'backdrop-neon-street', name: 'Neon nights', description: 'Glowing signs reflected on a rainy street.', tier: 'premium', price: 2600, theme: 'night' },
  { id: 'backdrop-outer-space', name: 'Outer space', description: 'Ringed planets, a comet and a tiny rocket.', tier: 'premium', price: 2800, theme: 'space' },
  { id: 'backdrop-reef', name: 'Coral reef', description: 'Swaying kelp, bright corals, fish and rising bubbles.', tier: 'premium', price: 3000, theme: 'sea' },
  { id: 'backdrop-aurora', name: 'Northern lights', description: 'Shimmering aurora over a snowy cabin.', tier: 'premium', price: 3500, theme: 'night' },
]

export const BACKDROPS: BackdropDef[] = ENTRIES.map((e) => ({ ...e, kind: 'backdrop', slot: 'backdrop' }))
