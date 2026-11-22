// Checks the quest and shop catalogues against the economy contract (features/economy/types.ts)
// and that backend/supabase/migrations/008_economy_catalog.sql matches them.
// Run with `npm run check:economy`. Exits 1 and lists every problem if something is off.
// Same options as gen-economy-sql.mjs: --quests <file> --shop <file> --out <file>
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { FRONTEND, buildSql, loadCatalogs, parseArgs, readExisting } from './gen-economy-sql.mjs'

const contract = await import(pathToFileURL(resolve(FRONTEND, 'src/features/economy/types.ts')).href)
const { REWARD_BANDS, ACCESSORY_PRICE_BANDS, BACKDROP_PRICE_BANDS } = contract

/** Item ids people already own from the first shop: they must stay in the catalogue. */
const LEGACY_ITEM_IDS = [
  'shades', 'round-specs', 'scarf', 'bow-tie', 'camera', 'explorer-hat', 'beret', 'party-hat',
  'flower-crown', 'backdrop-sunburst', 'backdrop-tiles', 'backdrop-sunset',
]
/** Quest ids claimed under the first challenge system (their claims map onto these). */
const LEGACY_QUEST_IDS = ['daily-hunt', 'starter-profile', 'starter-two-modes', 'starter-passport']

const CATEGORIES = Object.keys(REWARD_BANDS)
const WEAR_SLOTS = ['head', 'hair', 'face', 'ears', 'neck', 'back', 'hand']
const CONDITION_TYPES = ['hunts', 'photos', 'new_cities', 'profile', 'visit', 'quests_completed', 'purchases', 'equipped']
const PROFILE_CHECKS = ['questionnaire_complete', 'home_city_pinned', 'avatar_chosen', 'both_modes_ready', 'first_city']
const VISIT_PAGES = ['map', 'shop', 'gallery', 'chat', 'quests']
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const paths = parseArgs(process.argv.slice(2))
const problems = []
const warnings = []
const { questDefs, shopItems } = await loadCatalogs(paths)

// ---- Quests ----
const questIds = new Set()
for (const d of questDefs) {
  const at = `quest ${d.id}`
  if (typeof d.id !== 'string' || !ID_RE.test(d.id)) problems.push(`${at}: id must be lower-case words joined by '-'`)
  if (questIds.has(d.id)) problems.push(`${at}: duplicate id`)
  questIds.add(d.id)
  if (!CATEGORIES.includes(d.category)) {
    problems.push(`${at}: unknown category ${d.category}`)
    continue
  }
  const [lo, hi] = REWARD_BANDS[d.category]
  if (!Number.isInteger(d.reward) || d.reward < lo || d.reward > hi) problems.push(`${at}: reward ${d.reward} is outside the ${d.category} band ${lo}–${hi}`)
  if (!d.title || !d.objective) problems.push(`${at}: needs a title and an objective`)
  const c = d.condition ?? {}
  if (!CONDITION_TYPES.includes(c.type)) problems.push(`${at}: unknown condition type ${c.type}`)
  else if (c.type === 'profile' && !PROFILE_CHECKS.includes(c.check)) problems.push(`${at}: unknown profile check ${c.check}`)
  else if (c.type === 'visit' && !VISIT_PAGES.includes(c.page)) problems.push(`${at}: unknown page ${c.page}`)
  else if (!['profile', 'visit'].includes(c.type) && !(Number.isInteger(c.count) && c.count >= 1)) problems.push(`${at}: condition count must be a whole number ≥ 1`)
  if (c.type === 'photos' && c.distinctCities !== undefined && !(Number.isInteger(c.distinctCities) && c.distinctCities >= 1))
    problems.push(`${at}: distinctCities must be a whole number ≥ 1`)
  if (d.company !== undefined && !['solo', 'companion', 'either'].includes(d.company)) problems.push(`${at}: unknown company ${d.company}`)
  if (d.effort !== undefined && !['light', 'moderate', 'big'].includes(d.effort)) problems.push(`${at}: unknown effort ${d.effort}`)
  for (const m of d.modes ?? []) if (!['tourist', 'local'].includes(m)) problems.push(`${at}: unknown mode ${m}`)
}
for (const id of LEGACY_QUEST_IDS) if (!questIds.has(id)) problems.push(`quest ${id} is missing (old claims point at it; set retired: true instead of deleting)`)
for (const cat of ['weekly', 'daily', 'adventure']) {
  const live = questDefs.filter((d) => d.category === cat && !d.retired).length
  const need = cat === 'weekly' ? 2 : 4 // enough to rotate and to refresh a daily
  if (live < need) problems.push(`only ${live} live ${cat} quests; need at least ${need}`)
}
const soloAdventures = questDefs.filter((d) => d.category === 'adventure' && !d.retired && d.company !== 'companion').length
if (soloAdventures < 3) problems.push(`only ${soloAdventures} live adventures can be done alone; need at least 3`)

// ---- Shop ----
let avatarIds = null
try {
  const avatars = await import(pathToFileURL(resolve(FRONTEND, 'src/lib/avatars.ts')).href)
  const list = avatars.AVATAR_CATALOG
  if (Array.isArray(list)) avatarIds = new Set(list.map((a) => a.id))
} catch {
  warnings.push('could not read src/lib/avatars.ts, so fit avatar ids were not checked')
}

const itemIds = new Set()
for (const s of shopItems) {
  const at = `item ${s.id}`
  if (typeof s.id !== 'string' || !ID_RE.test(s.id)) problems.push(`${at}: id must be lower-case words joined by '-'`)
  if (itemIds.has(s.id)) problems.push(`${at}: duplicate id`)
  itemIds.add(s.id)
  if (!s.name) problems.push(`${at}: needs a name`)
  if (!Number.isInteger(s.price)) problems.push(`${at}: price must be a whole number`)
  if (s.kind === 'accessory') {
    if (!WEAR_SLOTS.includes(s.slot)) problems.push(`${at}: unknown wear slot ${s.slot}`)
    const band = ACCESSORY_PRICE_BANDS[s.rarity]
    if (!band) problems.push(`${at}: unknown rarity ${s.rarity}`)
    else if (s.price < band[0] || s.price > band[1]) problems.push(`${at}: price ${s.price} is outside the ${s.rarity} band ${band[0]}–${band[1]}`)
    const fits = Object.keys(s.fits ?? {})
    if (fits.length === 0) problems.push(`${at}: needs at least one avatar fit`)
    if (avatarIds) for (const a of fits) if (!avatarIds.has(a)) warnings.push(`${at}: fit for unknown avatar '${a}'`)
  } else if (s.kind === 'backdrop') {
    if (s.slot !== 'backdrop') problems.push(`${at}: backdrops go in the 'backdrop' slot`)
    const band = BACKDROP_PRICE_BANDS[s.tier]
    if (!band) problems.push(`${at}: unknown tier ${s.tier}`)
    else if (s.price < band[0] || s.price > band[1]) problems.push(`${at}: price ${s.price} is outside the ${s.tier} band ${band[0]}–${band[1]}`)
  } else problems.push(`${at}: unknown kind ${s.kind}`)
}
for (const id of LEGACY_ITEM_IDS) if (!itemIds.has(id)) problems.push(`item ${id} is missing (people own it; set retired: true instead of deleting)`)

// ---- 008 up to date ----
const expected = buildSql({ questDefs, shopItems })
const actual = readExisting(paths.out)
if (actual === null) problems.push(`${paths.out} doesn't exist: run npm run gen:economy`)
else if (actual !== expected) problems.push(`${paths.out} is out of date: run npm run gen:economy (then run it in Supabase)`)

for (const w of warnings) console.warn(`warning: ${w}`)
if (problems.length) {
  console.error(`Economy check failed (${problems.length}):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`Economy check passed: ${questDefs.length} quests, ${shopItems.length} shop items, 008 is up to date.`)
