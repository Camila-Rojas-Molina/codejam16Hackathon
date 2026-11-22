// Map geometry helpers: Montréal Island framing, viewport keys for the landmark cache, GeoJSON →
// Google Maps paths, and the category labels and glyphs the markers, sheet and list share.
/// <reference types="google.maps" />
import type { IconName } from '../../components/icons/Icon'
import type { Bounds, GeoPolygon, LandmarkCategory } from '../explore/types'
import type { LatLng } from './types'

/** Downtown Montréal, roughly between the Plateau and the Old Port. */
export const MONTREAL_CENTER: LatLng = { lat: 45.5089, lng: -73.5617 }
export const DEFAULT_ZOOM = 12

/** The island plus a margin. Panning is loosely held here (strictBounds off). */
export const ISLAND_BOUNDS: Bounds = { west: -74.0, south: 45.38, east: -73.45, north: 45.72 }

export const ISLAND_LAT_LNG_BOUNDS: google.maps.LatLngBoundsLiteral = {
  west: ISLAND_BOUNDS.west,
  south: ISLAND_BOUNDS.south,
  east: ISLAND_BOUNDS.east,
  north: ISLAND_BOUNDS.north,
}

export function toBounds(b: google.maps.LatLngBounds): Bounds {
  const ne = b.getNorthEast()
  const sw = b.getSouthWest()
  return { west: sw.lng(), south: sw.lat(), east: ne.lng(), north: ne.lat() }
}

// Viewports are snapped outward to a 0.01° grid (~1 km) before fetching, so small pans and zooms
// hit the cache, and every cached response covers at least the viewport that asked for it.
const GRID = 0.01
const down = (v: number) => Math.floor(v / GRID) * GRID
const up = (v: number) => Math.ceil(v / GRID) * GRID

export function snapBounds(b: Bounds): Bounds {
  return {
    west: +down(b.west).toFixed(2),
    south: +down(b.south).toFixed(2),
    east: +up(b.east).toFixed(2),
    north: +up(b.north).toFixed(2),
  }
}

export const boundsKey = (b: Bounds) => `${b.west},${b.south},${b.east},${b.north}`

export function parseBoundsKey(key: string): Bounds {
  const [west, south, east, north] = key.split(',').map(Number)
  return { west, south, east, north }
}

export const containsPoint = (b: Bounds, p: LatLng) => p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east

/** GeoJSON [lng, lat] rings → Google Maps paths. A MultiPolygon becomes one path per ring. */
export function polygonPaths(g: GeoPolygon): LatLng[][] {
  const rings = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat()
  return rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
}

export function pathsBounds(paths: LatLng[][]): google.maps.LatLngBoundsLiteral | null {
  const pts = paths.flat()
  if (pts.length === 0) return null
  return {
    west: Math.min(...pts.map((p) => p.lng)),
    east: Math.max(...pts.map((p) => p.lng)),
    south: Math.min(...pts.map((p) => p.lat)),
    north: Math.max(...pts.map((p) => p.lat)),
  }
}

export const CATEGORIES: Record<LandmarkCategory, { label: string; icon: IconName }> = {
  landmark: { label: 'Landmark', icon: 'flag' },
  museum: { label: 'Museum', icon: 'columns' },
  park: { label: 'Park', icon: 'tree' },
  historic: { label: 'Historic site', icon: 'castle' },
  architecture: { label: 'Architecture', icon: 'buildings' },
  religious: { label: 'Religious site', icon: 'tower' },
  culture: { label: 'Culture', icon: 'mask' },
  viewpoint: { label: 'Viewpoint', icon: 'mountain' },
  market: { label: 'Market', icon: 'basket' },
  'public-art': { label: 'Public art', icon: 'palette' },
  campus: { label: 'Campus', icon: 'book' },
  other: { label: 'Place', icon: 'pin' },
}

export const categoryOf = (c: LandmarkCategory) => CATEGORIES[c] ?? CATEGORIES.other

export const formatDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

/** Reads a colour token (e.g. "--color-ink") for APIs that need a literal colour (circles, polygons). */
export function cssToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** The four pin states, in words (marker titles, the list). */
export function pinStateLabel({ visited, recommended }: { visited: boolean; recommended: boolean }) {
  if (visited && recommended) return 'Recommended, visited'
  if (visited) return 'Visited'
  if (recommended) return 'Recommended, not visited yet'
  return 'Not visited yet'
}
