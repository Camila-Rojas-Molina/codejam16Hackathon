// Turns the quest and shop catalogues into SQL seed data for the server:
//   src/features/quests/catalog/index.ts   (QUEST_DEFS)
//   src/features/rewards/catalog/index.ts  (SHOP_ITEMS)
//   → ../backend/supabase/migrations/008_economy_catalog.sql
//
// Run it with `npm run gen:economy` after changing a catalogue, then run the new 008 in Supabase.
// The SQL only upserts: ids are never deleted, and an id that's no longer in a catalogue is marked
// retired (people who own an item or have a quest keep it). The output is deterministic, so
// `npm run check:economy` can tell whether 008 is up to date.
//
// Options (for testing with other files): --quests <file> --shop <file> --out <file>
//
// The catalogues are TypeScript with extension-less imports (Vite style). Node strips the types
// (--experimental-strip-types, Node 22); the resolve hook below adds the missing '.ts'.
import { register } from 'node:module'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HOOK = `
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (!/^\\.{1,2}\\//.test(specifier) || /\\.[cm]?[jt]s$/.test(specifier)) throw err
    for (const suffix of ['.ts', '/index.ts']) {
      try { return await next(specifier + suffix, context) } catch {}
    }
    throw err
  }
}`
register('data:text/javascript,' + encodeURIComponent(HOOK), import.meta.url)

export const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_PATHS = {
  quests: resolve(FRONTEND, 'src/features/quests/catalog/index.ts'),
  shop: resolve(FRONTEND, 'src/features/rewards/catalog/index.ts'),
  out: resolve(FRONTEND, '../backend/supabase/migrations/008_economy_catalog.sql'),
}

export function parseArgs(argv) {
  const paths = { ...DEFAULT_PATHS }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '')
    if (key in paths && argv[i + 1]) paths[key] = resolve(argv[++i])
  }
  return paths
}

export async function loadCatalogs(paths) {
  const quests = await import(pathToFileURL(paths.quests).href)
  const shop = await import(pathToFileURL(paths.shop).href)
  if (!Array.isArray(quests.QUEST_DEFS)) throw new Error(`${paths.quests} does not export QUEST_DEFS`)
  if (!Array.isArray(shop.SHOP_ITEMS)) throw new Error(`${paths.shop} does not export SHOP_ITEMS`)
  return { questDefs: quests.QUEST_DEFS, shopItems: shop.SHOP_ITEMS }
}

// ---- SQL ---------------------------------------------------------------------------------------

const str = (v) => (v === undefined || v === null ? 'null' : `'${String(v).replaceAll("'", "''")}'`)
const int = (v) => {
  if (!Number.isInteger(v)) throw new Error(`Expected an integer, got ${JSON.stringify(v)}`)
  return String(v)
}
const bool = (v) => (v ? 'true' : 'false')
const textArray = (v) => (v && v.length ? `array[${v.map(str).join(', ')}]::text[]` : `'{}'::text[]`)
/** JSON with sorted keys, so the output doesn't depend on property order. */
const stableJson = (v) =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x))
const jsonb = (v) => `${str(stableJson(v))}::jsonb`

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

function questRow(d) {
  return `  (${[
    str(d.id),
    str(d.category),
    str(d.title),
    str(d.description ?? ''),
    str(d.objective ?? ''),
    int(d.reward),
    jsonb(d.condition),
    textArray(d.interests),
    str(d.company ?? null),
    textArray(d.modes),
    textArray(d.avoidFor),
    str(d.effort ?? null),
    bool(d.retired),
  ].join(', ')})`
}

function shopRow(s) {
  return `  (${[str(s.id), str(s.kind), str(s.name ?? ''), str(s.slot), str(s.kind === 'backdrop' ? s.tier : s.rarity), int(s.price), bool(s.retired)].join(', ')})`
}

export function buildSql({ questDefs, shopItems }) {
  const quests = [...questDefs].sort(byId)
  const items = [...shopItems].sort(byId)
  const lines = [
    '-- GENERATED FILE: do not edit. Made by `npm run gen:economy` (frontend/scripts/gen-economy-sql.mjs)',
    '-- from frontend/src/features/quests/catalog and frontend/src/features/rewards/catalog.',
    '-- Run after 007_economy.sql, and again whenever the catalogues change. Safe to run again.',
    '--',
    "-- The server's copy of every quest (rewards, conditions, personalisation) and shop item (prices).",
    '-- Only upserts: ids are never deleted. An id missing from the catalogues is marked retired, so',
    '-- people keep what they own and their quest history.',
    '',
    `-- ${quests.length} quests`,
    'insert into quest_defs (id, category, title, description, objective, reward, condition, interests, company, modes, avoid_for, effort, retired)',
    'values',
    quests.map(questRow).join(',\n'),
    'on conflict (id) do update set',
    '  category = excluded.category, title = excluded.title, description = excluded.description,',
    '  objective = excluded.objective, reward = excluded.reward, condition = excluded.condition,',
    '  interests = excluded.interests, company = excluded.company, modes = excluded.modes,',
    '  avoid_for = excluded.avoid_for, effort = excluded.effort, retired = excluded.retired, updated_at = now();',
    '',
    'update quest_defs set retired = true, updated_at = now()',
    ` where not retired and id not in (${quests.map((d) => str(d.id)).join(', ')});`,
    '',
    `-- ${items.length} shop items`,
    'insert into shop_items (id, kind, name, slot, rarity_or_tier, price, retired)',
    'values',
    items.map(shopRow).join(',\n'),
    'on conflict (id) do update set',
    '  kind = excluded.kind, name = excluded.name, slot = excluded.slot,',
    '  rarity_or_tier = excluded.rarity_or_tier, price = excluded.price, retired = excluded.retired, updated_at = now();',
    '',
    'update shop_items set retired = true, updated_at = now()',
    ` where not retired and id not in (${items.map((s) => str(s.id)).join(', ')});`,
    '',
  ]
  return lines.join('\n')
}

export function readExisting(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

// ---- CLI -----------------------------------------------------------------------------------------

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = parseArgs(process.argv.slice(2))
  const catalogs = await loadCatalogs(paths)
  if (!catalogs.questDefs.length || !catalogs.shopItems.length) {
    console.error('A catalogue is empty; refusing to write SQL that would retire everything.')
    process.exit(1)
  }
  const sql = buildSql(catalogs)
  writeFileSync(paths.out, sql)
  console.log(`Wrote ${paths.out}: ${catalogs.questDefs.length} quests, ${catalogs.shopItems.length} shop items.`)
}
