// The whole shop catalogue: every wearable (./accessories) and every backdrop (./backdrops).
// Plain data, no React: `npm run gen:economy` reads it to seed the server's copy
// (backend/supabase/migrations/012_economy_catalog.sql). Ids are saved in accounts: never rename or
// delete one, set `retired: true` instead. Helpers for the app live in ../shop.ts.
import type { ShopItemDef } from '../../economy/types'
import { ACCESSORIES } from './accessories'
import { BACKDROPS } from './backdrops'

export { ACCESSORIES, BACKDROPS }

export const SHOP_ITEMS: ShopItemDef[] = [...ACCESSORIES, ...BACKDROPS]
