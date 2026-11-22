// Helpers on top of the shop catalogue (the data lives in ./catalog: accessories + backdrops).
// Everything the Shop, Profile, the avatar renderer and the device economy need to look items up,
// group, filter and sort them, and say whether one fits the person's avatar or is affordable.
//
// Item ids are saved in accounts (owned + equipped), so the catalogue never renames or removes one:
// retired items stop being sold, but people who own them still see (and can wear) them.
import type { AccessoryDef, BackdropDef, BackdropTier, Rarity, ShopItemDef, ShopSlot, WearSlot } from '../economy/types'
import { resolveAvatar } from '../../lib/avatars'
import { SHOP_ITEMS } from './catalog'

export { SHOP_ITEMS }
export type { AccessoryDef, BackdropDef, ShopItemDef }
/** One shop item (wearable or backdrop). */
export type ShopItem = ShopItemDef

/**
 * @deprecated Old per-item placement nudge (pre per-avatar fits). Kept only so older imports still
 * type-check while the renderer moves to `AccessoryDef.fits`; catalogue items no longer carry it.
 */
export type ItemFit = { dx?: number; dy?: number; scale?: number; r?: number }

// ---- Slots, rarities, tiers, themes ------------------------------------------------------------

/** Wearable slots, in browsing order. */
export const WEAR_SLOTS: readonly WearSlot[] = ['head', 'hair', 'face', 'ears', 'neck', 'back', 'hand']
/** Every shop slot, in browsing order (wearables first, then backdrops). */
export const SHOP_SLOTS: readonly ShopSlot[] = [...WEAR_SLOTS, 'backdrop']

/** Category names (plural, for filters and section headings). */
export const SLOT_LABELS: Record<ShopSlot, string> = {
  head: 'Hats',
  hair: 'Hair',
  face: 'Face',
  ears: 'Ears',
  neck: 'Neckwear',
  back: 'On your back',
  hand: 'In hand',
  backdrop: 'Backdrops',
}

export const RARITY_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'premium']
export const RARITY_LABELS: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', premium: 'Premium' }

export const TIER_ORDER: readonly BackdropTier[] = ['standard', 'detailed', 'premium']
export const TIER_LABELS: Record<BackdropTier, string> = { standard: 'Standard', detailed: 'Detailed', premium: 'Premium' }

/** Friendly names for known theme tags; unknown tags are title-cased. */
const THEME_NAMES: Record<string, string> = {
  travel: 'Travel',
  seasonal: 'Seasonal',
  classic: 'Classic',
  fun: 'Just for fun',
  music: 'Music',
  city: 'City',
  nature: 'Nature',
  food: 'Food & café',
  night: 'Night',
  sport: 'Sport',
  art: 'Art',
  retro: 'Retro',
  montreal: 'Montréal',
}

export function themeLabel(theme: string): string {
  return THEME_NAMES[theme] ?? theme.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/** The rarity (wearables) or tier (backdrops) of an item, with a 0-based rank for sorting/styling. */
export function itemGrade(item: ShopItemDef): { value: Rarity | BackdropTier; label: string; rank: number } {
  if (item.kind === 'accessory') return { value: item.rarity, label: RARITY_LABELS[item.rarity], rank: RARITY_ORDER.indexOf(item.rarity) }
  return { value: item.tier, label: TIER_LABELS[item.tier], rank: TIER_ORDER.indexOf(item.tier) }
}

// ---- Lookups -----------------------------------------------------------------------------------

const BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]))

export const shopItem = (id: string | null | undefined): ShopItemDef | undefined => (id ? BY_ID.get(id) : undefined)

export const isAccessory = (item: ShopItemDef | undefined): item is AccessoryDef => item?.kind === 'accessory'
export const isBackdrop = (item: ShopItemDef | undefined): item is BackdropDef => item?.kind === 'backdrop'

/** Items on sale (retired ones only show to people who own them: pass `owned`). */
export const itemsForSale = (slot?: ShopSlot, owned?: readonly string[]) =>
  SHOP_ITEMS.filter((i) => (!i.retired || !!owned?.includes(i.id)) && (!slot || i.slot === slot))

/** Theme tags used by items of one kind, in first-seen order. */
export function shopThemes(kind: ShopItemDef['kind']): string[] {
  const seen = new Set<string>()
  for (const i of SHOP_ITEMS) if (i.kind === kind && !i.retired && i.theme) seen.add(i.theme)
  return [...seen]
}

// ---- Avatar compatibility ----------------------------------------------------------------------

/**
 * Whether an item can be worn by this avatar. Backdrops fit everyone; a wearable fits only the
 * avatars listed in its `fits` (unknown/legacy avatar values resolve to the picture actually shown).
 */
export function fitsAvatar(item: ShopItemDef, avatarId: string | null | undefined): boolean {
  if (item.kind === 'backdrop') return true
  return !!item.fits[resolveAvatar(avatarId)]
}

/** A short lower-case name for an avatar ("disco ball"), for lines like "Doesn't fit your disco ball". */
export function avatarShortName(avatarId: string | null | undefined): string {
  return resolveAvatar(avatarId).replace(/[-_]+/g, ' ')
}

// ---- Money & state -----------------------------------------------------------------------------

export const canAfford = (item: ShopItemDef, balance: number) => balance >= item.price
/** Points still missing to buy it (0 when affordable). */
export const pointsShort = (item: ShopItemDef, balance: number) => Math.max(0, item.price - balance)

export const isOwned = (item: ShopItemDef, owned: readonly string[]) => owned.includes(item.id)
export const isEquipped = (item: ShopItemDef, equipped: Partial<Record<ShopSlot, string>>) => equipped[item.slot] === item.id

export type ItemState = 'equipped' | 'owned' | 'affordable' | 'locked'

export function itemState(item: ShopItemDef, inv: { balance: number; owned: readonly string[]; equipped: Partial<Record<ShopSlot, string>> }): ItemState {
  if (isOwned(item, inv.owned)) return isEquipped(item, inv.equipped) ? 'equipped' : 'owned'
  return canAfford(item, inv.balance) ? 'affordable' : 'locked'
}

// ---- Browsing ----------------------------------------------------------------------------------

export type OwnershipFilter = 'all' | 'afford' | 'owned' | 'equipped' | 'not-owned'
export const OWNERSHIP_LABELS: Record<OwnershipFilter, string> = {
  all: 'All',
  afford: 'Can afford',
  owned: 'Owned',
  equipped: 'Equipped',
  'not-owned': 'Not owned',
}

export type ShopSort = 'featured' | 'price-asc' | 'price-desc'
export const SORT_LABELS: Record<ShopSort, string> = { featured: 'Featured', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low' }

export type ShopQuery = {
  kind: ShopItemDef['kind']
  /** Accessories: a wear slot. Backdrops: a theme tag. 'all' = any. */
  category: string
  /** Rarity (accessories) or tier (backdrops). 'all' = any. */
  grade: string
  ownership: OwnershipFilter
  sort: ShopSort
  avatar: string
  /** Include wearables that don't fit the avatar (shown disabled). */
  showUnfit: boolean
}

/** The catalogue filtered and sorted for one view. Retired items appear only for their owners. */
export function browseItems(q: ShopQuery, inv: { balance: number; owned: readonly string[]; equipped: Partial<Record<ShopSlot, string>> }): ShopItemDef[] {
  const list = SHOP_ITEMS.filter((i) => {
    if (i.kind !== q.kind) return false
    const owned = isOwned(i, inv.owned)
    if (i.retired && !owned) return false
    if (q.category !== 'all' && (i.kind === 'accessory' ? i.slot : i.theme) !== q.category) return false
    if (q.grade !== 'all' && itemGrade(i).value !== q.grade) return false
    if (!q.showUnfit && !fitsAvatar(i, q.avatar)) return false
    switch (q.ownership) {
      case 'afford':
        return !owned && canAfford(i, inv.balance)
      case 'owned':
        return owned
      case 'equipped':
        return owned && isEquipped(i, inv.equipped)
      case 'not-owned':
        return !owned
      default:
        return true
    }
  })
  if (q.sort === 'featured') {
    // Catalogue order within each slot (slot order for wearables), unfit ones last.
    const slotRank = (i: ShopItemDef) => SHOP_SLOTS.indexOf(i.slot)
    const fit = (i: ShopItemDef) => (fitsAvatar(i, q.avatar) ? 0 : 1)
    return list
      .map((i, n) => ({ i, n }))
      .sort((a, b) => fit(a.i) - fit(b.i) || slotRank(a.i) - slotRank(b.i) || a.n - b.n)
      .map((x) => x.i)
  }
  const dir = q.sort === 'price-asc' ? 1 : -1
  return [...list].sort((a, b) => dir * (a.price - b.price) || a.name.localeCompare(b.name))
}
