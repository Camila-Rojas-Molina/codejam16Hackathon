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
