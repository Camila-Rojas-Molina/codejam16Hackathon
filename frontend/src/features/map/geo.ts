// Map geometry for Montréal Island: the default camera, the loose island restriction, bounds
// helpers for the landmark cache and GeoJSON → Google paths. Pure functions, no map instance.
import type { Bounds, GeoPolygon } from '../explore/types'
import type { LatLng } from './types'

export const MONTREAL_CENTER: LatLng = { lat: 45.5089, lng: -73.5617 }
export const DEFAULT_ZOOM = 12

/** The island and a little water around it. The map is held loosely here (strictBounds false). */
export const ISLAND_BOUNDS: Bounds = { west: -74.05, south: 45.38, east: -73.42, north: 45.72 }

/** Zoom used when focusing a single landmark. */
export const FOCUS_ZOOM = 16

export const inBounds = (p: LatLng, b: Bounds) => p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east

/** Grows bounds by a fraction of their size on every side. */
export function padBounds(b: Bounds, fraction: number): Bounds {
  const dx = (b.east - b.west) * fraction
  const dy = (b.north - b.south) * fraction
  return { west: b.west - dx, south: b.south - dy, east: b.east + dx, north: b.north + dy }
}

/**
 * The area to fetch for a viewport: snapped outward to a grid that scales with the viewport (so
 * small pans reuse the same request), then clipped to the island. Null when the view is off-island.
 */
export function fetchArea(view: Bounds): Bounds | null {
  const span = Math.max(view.east - view.west, view.north - view.south)
  let step = 0.005
  while (step < span / 3) step *= 2
  const snapped: Bounds = {
    west: Math.floor(view.west / step) * step,
    south: Math.floor(view.south / step) * step,
    east: Math.ceil(view.east / step) * step,
    north: Math.ceil(view.north / step) * step,
  }
  const clipped: Bounds = {
    west: Math.max(snapped.west, ISLAND_BOUNDS.west),
    south: Math.max(snapped.south, ISLAND_BOUNDS.south),
    east: Math.min(snapped.east, ISLAND_BOUNDS.east),
    north: Math.min(snapped.north, ISLAND_BOUNDS.north),
  }
  return clipped.west < clipped.east && clipped.south < clipped.north ? clipped : null
}

export const boundsKey = (b: Bounds) => [b.west, b.south, b.east, b.north].map((v) => v.toFixed(4)).join(',')

/** GeoJSON rings ([lng, lat]) → Google paths ({lat, lng}). A MultiPolygon becomes several paths. */
export function polygonPaths(p: GeoPolygon): LatLng[][] {
  const rings = p.type === 'Polygon' ? p.coordinates : p.coordinates.flat()
  return rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
}

/** The box around a set of points, or null when there are none. */
export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const p of points) {
    west = Math.min(west, p.lng)
    east = Math.max(east, p.lng)
    south = Math.min(south, p.lat)
    north = Math.max(north, p.lat)
  }
  return { west, south, east, north }
}
