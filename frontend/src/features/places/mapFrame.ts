// The atlas's equirectangular frame (shared by the land outlines and the pins).
//   x = (lng + 180) / 360 * MAP_W        y = (NORTH - lat) / 360 * MAP_W
// Latitudes south of SOUTH (most of Antarctica) are cropped so the map keeps a friendly shape.
export const MAP_W = 1000
export const NORTH = 84
export const SOUTH = -58
export const MAP_H = ((NORTH - SOUTH) / 360) * MAP_W

export function project(lat: number, lng: number): [number, number] {
  return [((lng + 180) / 360) * MAP_W, ((NORTH - lat) / 360) * MAP_W]
}

/** The visible part of the map, in map units (a viewBox). */
export type MapView = { x: number; y: number; w: number; h: number }

/** Closest zoom: about 13° of longitude across. */
export const MIN_VIEW_W = 36

/** The whole map at the given aspect (width / height), with ocean filling any spare room. */
export function worldView(aspect: number): MapView {
  const h = MAP_W / aspect
  if (h >= MAP_H) return { x: 0, y: (MAP_H - h) / 2, w: MAP_W, h }
  const w = MAP_H * aspect
  return { x: (MAP_W - w) / 2, y: 0, w, h: MAP_H }
}

/** Keeps a view inside the map (or centred on it, when the view is bigger than the map). */
export function clampView(v: MapView): MapView {
  const x = v.w >= MAP_W ? (MAP_W - v.w) / 2 : Math.min(Math.max(0, v.x), MAP_W - v.w)
  const y = v.h >= MAP_H ? (MAP_H - v.h) / 2 : Math.min(Math.max(0, v.y), MAP_H - v.h)
  return { ...v, x, y }
}

/**
 * The smallest view at this aspect that shows every point (map units) with room around it, never
 * closer than `minW`. Falls back to the whole world when the points are spread across most of it.
 */
export function fitView(points: [number, number][], aspect: number, minW = MIN_VIEW_W): MapView {
  const world = worldView(aspect)
  if (points.length === 0) return world
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  // Generous padding: pins stand above their point and their name tags above that.
  const w = Math.max(minW, (x1 - x0) * 1.5 + minW * 0.25, ((y1 - y0) * 1.7 + minW * 0.3) * aspect)
  if (w >= world.w * 0.8) return world
  const h = w / aspect
  const cx = (x0 + x1) / 2
  // Shift the centre up a little, so pins near the top keep their name tags in view.
  const cy = (y0 + y1) / 2 - h * 0.06
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h })
}

export const sameView = (a: MapView, b: MapView) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5
