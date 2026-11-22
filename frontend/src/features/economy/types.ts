// MIGO's points economy: the shared contract between the quest catalogue, the shop catalogue,
// the server (backend/supabase/migrations/011_economy.sql) and the app.
//
// Rules that everything here is built around:
//   * The server is the source of truth for points, quests, inventory and what's equipped. The
//     browser never sends an amount or a price: it asks to claim a quest or buy an item by id, and
//     the server checks eligibility and uses ITS copy of the reward/price.
//   * Every points change is one ledger row with a unique `ref` per person, so a reward or a
//     purchase can never apply twice (repeat clicks, refreshes, two tabs).
//   * Days and weeks are computed on the server, in the person's saved timezone. The device clock
//     is never trusted.
//   * Catalogues (quests: features/quests/catalog/*, shop: features/rewards/catalog/*) are plain
//     data files with no React imports, so `npm run gen:economy` can turn them into SQL seed data
//     (backend/supabase/migrations/012_economy_catalog.sql). Ids are saved in accounts: never
//     rename or delete one; set `retired: true` instead.
//   * Device-only mode (no Supabase) runs the same rules locally (lib/economy/device.ts). It can't
//     be tamper-proof and says so; it exists so the app works offline and in development.

// ---- Quests ------------------------------------------------------------------------------------

export type QuestCategory = 'weekly' | 'daily' | 'adventure' | 'starter'

/** How many of each are active at once. */
export const QUEST_SLOTS = { weekly: 1, daily: 3, adventure: 3 } as const

/** Daily challenge refreshes per day. */
export const DAILY_REFRESHES = 1

/**
 * What the server can actually verify. Progress is always computed from stored data, never
 * self-reported. `period: true` = only count things that happened inside the quest's period.
 */
export type QuestCondition =
  // GPS-checked photo hunts (submissions). withPartner = the team had two members.
  | { type: 'hunts'; count: number; withPartner?: boolean; distinctHunts?: boolean; huntKinds?: string[] }
  // Gallery photos uploaded in the period. distinctCities = how many different tagged cities.
  | { type: 'photos'; count: number; distinctCities?: number; requireCity?: boolean }
  // Cities added to "Where have you explored?" during the period (by placeId, pinned only).
  | { type: 'new_cities'; count: number }
  // Profile facts (starter quests).
  | { type: 'profile'; check: 'questionnaire_complete' | 'home_city_pinned' | 'avatar_chosen' | 'both_modes_ready' | 'first_city' }
  // Visiting a section of the app (recorded by the app when the page is opened).
  | { type: 'visit'; page: 'map' | 'shop' | 'gallery' | 'chat' | 'quests' }
  // Counting other quest completions (e.g. "complete your first challenge").
  | { type: 'quests_completed'; count: number; categories?: QuestCategory[] }
  // Shop actions.
  | { type: 'purchases'; count: number }
  | { type: 'equipped'; count: number }

export type QuestDef = {
  id: string
  category: QuestCategory
  title: string
  /** One or two friendly sentences. */
  description: string
  /** Short requirement line, e.g. "Upload photos from 3 different cities". */
  objective: string
  reward: number
  condition: QuestCondition
  /** Icon name from components/icons (validated in the UI). */
  icon: string
  /** Where to go to make progress. */
  action?: { label: string; to: string }
  // Personalisation (adventures; optional elsewhere):
  /** Interest ids from features/profile/options that make this relevant. Empty = for everyone. */
  interests?: string[]
  /** 'solo' | 'companion' | 'either'. Companion quests are never the only option offered. */
  company?: 'solo' | 'companion' | 'either'
  /** Which mode it suits. */
  modes?: ('tourist' | 'local')[]
  /** Accessibility needs it is NOT suitable for (e.g. a stair-heavy viewpoint walk → ['mobility']). */
  avoidFor?: string[]
  /** Rough effort, for pace matching. */
  effort?: 'light' | 'moderate' | 'big'
  /** No longer offered; history keeps it. */
  retired?: boolean
}

export type QuestStatus = 'active' | 'completed' | 'expired' | 'replaced'

/** A quest given to one person for one period (what the server returns). */
export type QuestAssignment = {
  id: string
  defId: string
  category: QuestCategory
  /** 'w:2026-W48', 'd:2026-11-23:2' (slot), 'a:2026-W48:1', 'starter'. */
  periodKey: string
  status: QuestStatus
  progress: number
  target: number
  /** True when progress >= target and it hasn't been claimed yet. */
  claimable: boolean
  assignedAt: string
  /** ISO; null for starter quests (they don't expire). */
  expiresAt: string | null
  completedAt: string | null
  /** The reward actually paid (from the server's catalogue copy). */
  reward: number
}

// ---- Shop --------------------------------------------------------------------------------------

/** Where a wearable goes. 'back' renders BEHIND the avatar (backpacks, capes); the rest in front. */
export type WearSlot = 'head' | 'hair' | 'face' | 'ears' | 'neck' | 'back' | 'hand'
export type ShopSlot = WearSlot | 'backdrop'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'premium'
/** Backdrop tiers. */
export type BackdropTier = 'standard' | 'detailed' | 'premium'

/** Placement of one wearable on one avatar, in that avatar's 0–1 square. */
export type Fit = {
  /** Anchor centre. */
  x: number
  y: number
  /** Width of the item as a fraction of the square. */
  w: number
  /** Degrees. */
  r?: number
  /** Mirror horizontally. */
  flip?: boolean
  /** Draw behind the avatar picture instead of in front. Defaults from the slot ('back' = behind). */
  behind?: boolean
  /** Stacking within the same side (higher = on top). */
  z?: number
}

export type AccessoryDef = {
  id: string
  kind: 'accessory'
  name: string
  description: string
  slot: WearSlot
  rarity: Rarity
  price: number
  /** Drawing id in components/illustrations/accessories/. Defaults to the id. */
  art?: string
  /** Theme tag for browsing ('travel', 'seasonal', 'classic', 'fun', 'music', ...). */
  theme?: string
  /**
   * Per-avatar placement. An avatar that is NOT listed is NOT compatible: the item is hidden or
   * marked "doesn't fit your avatar" for it. Every entry here has been checked visually.
   */
  fits: Record<string, Fit>
  retired?: boolean
}

export type BackdropDef = {
  id: string
  kind: 'backdrop'
  name: string
  description: string
  slot: 'backdrop'
  tier: BackdropTier
  price: number
  art?: string
  theme?: string
  retired?: boolean
}

export type ShopItemDef = AccessoryDef | BackdropDef

/** Price bands the catalogue must stay inside (checked by `npm run check:economy`). */
export const ACCESSORY_PRICE_BANDS: Record<Rarity, [number, number]> = {
  common: [250, 500],
  uncommon: [500, 900],
  rare: [1000, 1600],
  premium: [1800, 2500],
}
export const BACKDROP_PRICE_BANDS: Record<BackdropTier, [number, number]> = {
  standard: [500, 900],
  detailed: [1000, 1800],
  premium: [2000, 3500],
}

/** Quest reward bands. */
export const REWARD_BANDS: Record<QuestCategory, [number, number]> = {
  weekly: [600, 800],
  daily: [75, 125],
  adventure: [125, 300],
  starter: [25, 75],
}

// ---- Ledger & state ----------------------------------------------------------------------------

export type LedgerKind = 'quest' | 'purchase' | 'legacy' | 'adjustment'

export type LedgerEntry = {
  id: string
  amount: number
  kind: LedgerKind
  /** Unique per person: 'quest:<assignment id>', 'purchase:<item id>', 'legacy:<old ref>'. */
  ref: string
  label: string
  at: string
}

/** Everything the Quests page, the Shop and the points badge need, in one response. */
export type EconomyState = {
  balance: number
  earnedTotal: number
  spentTotal: number
  /** Newest first, at most ~50. */
  recent: LedgerEntry[]
  owned: string[]
  equipped: Partial<Record<ShopSlot, string>>
  quests: QuestAssignment[]
  /** Completed quests (all categories), newest first. */
  history: QuestAssignment[]
  dailyRefreshAvailable: boolean
  /** ISO times of the next resets, in the person's timezone. */
  nextDailyReset: string
  nextWeeklyReset: string
  timezone: string
  /** 'server' = authoritative; 'device' = local only (not tamper-proof). */
  source: 'server' | 'device'
}

/** What the app can ask for. Every call returns the fresh state. */
export interface EconomyApi {
  load(): Promise<EconomyState>
  claim(assignmentId: string): Promise<EconomyState>
  refreshDaily(assignmentId: string): Promise<EconomyState>
  purchase(itemId: string): Promise<EconomyState>
  equip(slot: ShopSlot, itemId: string | null): Promise<EconomyState>
  recordVisit(page: 'map' | 'shop' | 'gallery' | 'chat' | 'quests'): Promise<void>
  /** Saves the browser's IANA timezone (server rate-limits changes). */
  setTimezone(tz: string): Promise<void>
}
