import type { LatLng } from './types'

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** You "found it" when you're this close to the target. */
export const ARRIVAL_RADIUS_M = 75
/** The hint circle shrinks from this radius... */
export const HINT_START_RADIUS_M = 600
/** ...to this one as time runs out. */
export const HINT_END_RADIUS_M = 100

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function isArrived(distanceM: number) {
  return distanceM <= ARRIVAL_RADIUS_M
}

/** "≈ 240 m away" / "≈ 1.3 km away". Rounded so it reads as a hint, not a GPS readout. */
export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) return `≈ ${Math.max(10, Math.round(distanceM / 10) * 10)} m away`
  return `≈ ${(distanceM / 1000).toFixed(1)} km away`
}

/** Point `meters` away from `from` in direction `bearingDeg` (0 = north, clockwise). */
export function offsetPoint(from: LatLng, meters: number, bearingDeg: number): LatLng {
  const d = meters / EARTH_RADIUS_M
  const brng = toRad(bearingDeg)
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng))
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

/**
 * Random-but-stable offset for one hunt attempt. Create once when the hunt starts.
 * `fraction` is how far off-centre the target sits, as a share of the current radius.
 */
export type HintSeed = { bearingDeg: number; fraction: number }

export function makeHintSeed(random: () => number = Math.random): HintSeed {
  return { bearingDeg: random() * 360, fraction: 0.35 + random() * 0.4 }
}

/**
 * The hint circle at a point in the hunt. `progress` goes 0 (start) to 1 (time's up).
 * The centre is pushed away from the target by `fraction * radius`, so with fraction < 1
 * the target is always inside the circle but never at its centre, at every size.
 */
export function hintCircle(target: LatLng, progress: number, seed: HintSeed): { center: LatLng; radius: number } {
  const p = Math.min(1, Math.max(0, progress))
  const radius = HINT_START_RADIUS_M + (HINT_END_RADIUS_M - HINT_START_RADIUS_M) * p
  return { center: offsetPoint(target, radius * seed.fraction, seed.bearingDeg), radius }
}
