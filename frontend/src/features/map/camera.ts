// Where the camera was, kept in memory for this visit, so coming back to the tab, switching
// Day/Night (which rebuilds the map) or falling back to the other engine keeps the view.
import { DEFAULT_ZOOM, MONTREAL_CENTER } from './geo'
import type { LatLng } from './types'

/** The 3D map's default tilt and heading (the heading lines up with Montréal's street grid). */
export const DEFAULT_PITCH = 55
export const DEFAULT_BEARING = -34

export const lastCamera: { center: LatLng; zoom: number; pitch: number; bearing: number } = {
  center: MONTREAL_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: DEFAULT_PITCH,
  bearing: DEFAULT_BEARING,
}

export const isPhoneLayout = () => typeof window !== 'undefined' && !window.matchMedia?.('(min-width: 64rem)').matches

export const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** Room the sheet/panel takes, so a focused landmark isn't hidden under it. */
export function focusPadding(height: number) {
  return isPhoneLayout() ? { top: 48, left: 24, right: 24, bottom: Math.round(height * 0.5) } : { top: 48, left: 48, right: 400, bottom: 48 }
}

/** Theme colours from the CSS tokens (map engines need real colour values, not CSS variables). */
export function readToken(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
