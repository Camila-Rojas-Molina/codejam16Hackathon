// A small grid clusterer: landmarks are projected to Web Mercator pixels at the current zoom and
// grouped by screen cell. Close enough to Google's MarkerClusterer for a few thousand points, with
// no dependency. The cell grows until the number of DOM markers stays under MAX_MARKERS.
import type { LandmarkSummary } from '../explore/types'
import type { LatLng } from './types'

/** From this zoom up every landmark gets its own pin (unless there are too many to draw). */
export const CLUSTER_UNTIL_ZOOM = 17
const CELL_PX = 64
const MAX_MARKERS = 250

export type MapItem =
  | { kind: 'landmark'; key: string; landmark: LandmarkSummary }
  | { kind: 'cluster'; key: string; position: LatLng; members: LandmarkSummary[]; visited: number; recommended: number }

/** World pixel coordinates at a zoom level (256 px tiles). */
function project(p: LatLng, zoom: number) {
  const scale = 256 * 2 ** zoom
  const sin = Math.min(Math.max(Math.sin((p.lat * Math.PI) / 180), -0.9999), 0.9999)
  return { x: ((p.lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }
}

function grid(points: LandmarkSummary[], zoom: number, cell: number): MapItem[] {
  const cells = new Map<string, LandmarkSummary[]>()
  for (const l of points) {
    const { x, y } = project(l, zoom)
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`
    const bucket = cells.get(key)
    if (bucket) bucket.push(l)
    else cells.set(key, [l])
  }
  const items: MapItem[] = []
  for (const [key, members] of cells) {
    if (members.length === 1) {
      items.push({ kind: 'landmark', key: members[0].id, landmark: members[0] })
      continue
    }
    let lat = 0
    let lng = 0
    let visited = 0
    let recommended = 0
    for (const m of members) {
      lat += m.lat
      lng += m.lng
      if (m.visited) visited++
      if (m.recommended) recommended++
    }
    items.push({
      kind: 'cluster',
      key: `c${zoom}:${cell}:${key}`,
      position: { lat: lat / members.length, lng: lng / members.length },
      members,
      visited,
      recommended,
    })
  }
  return items
}

/** Pins and cluster bubbles for the landmarks in view at this zoom. */
export function clusterLandmarks(points: LandmarkSummary[], zoom: number): MapItem[] {
  const z = Math.round(zoom)
  let cell = z >= CLUSTER_UNTIL_ZOOM ? 0 : CELL_PX
  if (cell === 0 && points.length <= MAX_MARKERS) return points.map((l) => ({ kind: 'landmark', key: l.id, landmark: l }))
  if (cell === 0) cell = CELL_PX / 2
  let items = grid(points, z, cell)
  while (items.length > MAX_MARKERS && cell < 1024) {
    cell *= 2
    items = grid(points, z, cell)
  }
  return items
}
