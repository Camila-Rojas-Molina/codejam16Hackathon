// Turning stored places into atlas pins.
import type { PlacePick } from './types'

export type AtlasPin = { id: string; label: string; lat: number; lng: number }

/** "Lisbon, Portugal" (with the region when it was kept to tell two places apart). */
export const placeLabel = (p: Pick<PlacePick, 'name' | 'region' | 'country'>) => [p.name, p.region, p.country].filter(Boolean).join(', ')

export const placePin = (p: PlacePick, id = p.placeId): AtlasPin => ({ id, label: placeLabel(p), lat: p.lat, lng: p.lng })
