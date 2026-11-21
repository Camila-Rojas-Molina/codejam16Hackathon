// The MIGO shop: cosmetic accessories for Migo, bought with points. Art lives in
// components/illustrations/Accessories.tsx; this file is the catalogue (ids are stored, so keep them stable).
import type { AccessorySlot } from '../profile/types'

export type ShopItem = {
  id: string
  name: string
  description: string
  slot: AccessorySlot
  price: number
}

export const SLOT_LABELS: Record<AccessorySlot, string> = { head: 'Hats', face: 'Eyewear', neck: 'Neckwear' }

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'shades', name: 'Sunnies', description: 'For squinting at landmarks in style.', slot: 'face', price: 100 },
  { id: 'scarf', name: 'Cosy scarf', description: 'Winter in Montréal? Sorted.', slot: 'neck', price: 120 },
  { id: 'explorer-hat', name: 'Explorer hat', description: 'A wide brim for long days out.', slot: 'head', price: 150 },
  { id: 'beret', name: 'Beret', description: 'Instantly 40% more artistic.', slot: 'head', price: 150 },
  { id: 'camera', name: 'Film camera', description: 'Every hidden gem deserves a photo.', slot: 'neck', price: 180 },
  { id: 'flower-crown', name: 'Flower crown', description: 'For festival season and sunny parks.', slot: 'head', price: 200 },
]

export const shopItem = (id: string | null | undefined) => SHOP_ITEMS.find((i) => i.id === id)
