// The MIGO shop: cosmetics for your avatar, bought with points. This file is the whole catalogue:
// add an item by adding an entry here (and, for new artwork, a drawing in
// components/illustrations/Accessories.tsx). Item ids are saved in accounts (owned + equipped), so
// never rename or remove one: set `retired: true` to stop selling it while owners keep it.
//
// How an item is placed: each avatar defines anchor lines in its own 0–1 square (lib/avatars.ts:
// head = where a hat brim rests, face = the eye line, neck = the collar line). Wearable art is drawn
// 100 units wide centred on its anchor, so it scales and tilts with each character. `fit` nudges
// one item (in anchor widths), and `fitFor` nudges it on one avatar only. Backdrops fill the square.
import type { AccessorySlot } from '../profile/types'

/** A per-item adjustment, in anchor widths (dx/dy) and multipliers (scale). */
export type ItemFit = { dx?: number; dy?: number; scale?: number; r?: number }

export type ShopItem = {
  id: string
  name: string
  description: string
  slot: AccessorySlot
  price: number
  /** Drawing to use (components/illustrations/Accessories.tsx). Defaults to the id. */
  art?: string
  /** Placement tweak on every avatar. */
  fit?: ItemFit
  /** Placement tweak on specific avatars, by avatar id. */
  fitFor?: Record<string, ItemFit>
  /** No longer sold; people who own it keep it. */
  retired?: boolean
}

export const SLOT_LABELS: Record<AccessorySlot, string> = { head: 'Hats', face: 'Eyewear', neck: 'Neckwear', backdrop: 'Backdrops' }

/** Shop sections, in order. */
export const SHOP_SLOTS: readonly AccessorySlot[] = ['head', 'face', 'neck', 'backdrop']

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'shades', name: 'Sunnies', description: 'For squinting at landmarks in style.', slot: 'face', price: 100 },
  { id: 'round-specs', name: 'Reading specs', description: 'Perfect for menus, maps and museum plaques.', slot: 'face', price: 120 },
  { id: 'scarf', name: 'Cosy scarf', description: 'Winter in Montréal? Sorted.', slot: 'neck', price: 120 },
  { id: 'bow-tie', name: 'Bow tie', description: 'Dressed up for the opera, or the dépanneur.', slot: 'neck', price: 140 },
  { id: 'camera', name: 'Film camera', description: 'Every hidden gem deserves a photo.', slot: 'neck', price: 180 },
  { id: 'explorer-hat', name: 'Explorer hat', description: 'A wide brim for long days out.', slot: 'head', price: 150 },
  { id: 'beret', name: 'Beret', description: 'Instantly 40% more artistic.', slot: 'head', price: 150 },
  { id: 'party-hat', name: 'Party hat', description: 'Every finished quest is a reason to celebrate.', slot: 'head', price: 160 },
  { id: 'flower-crown', name: 'Flower crown', description: 'For festival season and sunny parks.', slot: 'head', price: 200 },
  { id: 'backdrop-sunburst', name: 'Sunburst', description: 'A café-poster burst of sunshine behind you.', slot: 'backdrop', price: 220 },
  { id: 'backdrop-tiles', name: 'Café tiles', description: 'Teal checks, like a corner bistro floor.', slot: 'backdrop', price: 220 },
  { id: 'backdrop-sunset', name: 'Golden hour', description: 'That evening glow over the river.', slot: 'backdrop', price: 260 },
]

export const shopItem = (id: string | null | undefined) => SHOP_ITEMS.find((i) => i.id === id)

/** Items on sale (retired ones only show to people who own them). */
export const itemsForSale = (slot?: AccessorySlot) => SHOP_ITEMS.filter((i) => !i.retired && (!slot || i.slot === slot))
