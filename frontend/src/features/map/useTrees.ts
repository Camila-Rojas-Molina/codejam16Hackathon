// Montréal's public trees (Ville de Montréal open data, "Arbres publics") as little paper-cut trees
// at street zoom. The data is a compact [lng, lat, trunkCm][] file made by scripts/build-trees.mjs
// for the central boroughs; it's only downloaded the first time someone zooms in close enough.
// Trees stand up in the tilted view (billboards), sized by trunk diameter.
import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { readPalette, type MapPalette } from './mapStyle'

const SOURCE = 'migo-trees'
const LAYER = 'migo-trees'
const ICON = 'migo-tree'
/** Trees appear from this zoom (clouds are gone by then). */
export const TREES_MIN_ZOOM = 15
const DATA_URL = '/data/trees.json'

type Collection = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { d: number }; geometry: { type: 'Point'; coordinates: [number, number] } }[]
}
let cached: Promise<Collection | null> | null = null
function loadTrees(): Promise<Collection | null> {
  cached ??= fetch(DATA_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((rows: [number, number, number][] | null) => {
      if (!Array.isArray(rows)) return null
      return {
        type: 'FeatureCollection' as const,
        features: rows.map(([lng, lat, d]) => ({ type: 'Feature' as const, properties: { d }, geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] } })),
      }
    })
    .catch(() => null)
  return cached
}

/** A round canopy with an inked edge and a short trunk, at 2× pixels. */
function treeIcon(p: MapPalette) {
  const w = 48
  const h = 64
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.lineWidth = 3
  ctx.strokeStyle = p.ink
  // Trunk
  ctx.fillStyle = p.ink
  ctx.fillRect(w / 2 - 3, 34, 6, 28)
  // Canopy: three overlapping puffs, outlined as one shape.
  const puffs: [number, number, number][] = [
    [w / 2, 20, 15],
    [w / 2 - 10, 32, 12],
    [w / 2 + 10, 32, 12],
  ]
  ctx.beginPath()
  for (const [x, y, r] of puffs) {
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.fillStyle = p.wood
  ctx.fill()
  // Light on the top left, like the rest of the atlas.
  ctx.fillStyle = p.parkLight
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.arc(w / 2 - 5, 15, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data }
}

/** The map is rebuilt on a Day/Night switch, so the palette is read again each time. */
export function useTrees(map: MapLibreMap | null) {
  useEffect(() => {
    if (!map) return
    const palette = readPalette()
    let alive = true
    let added = false

    const add = () => {
      if (added || map.getZoom() < TREES_MIN_ZOOM - 0.5) return
      added = true
      map.off('moveend', add)
      loadTrees().then((data) => {
        if (!alive || !data || map.getSource(SOURCE)) return
        const icon = treeIcon(palette)
        if (!icon) return
        if (!map.hasImage(ICON)) map.addImage(ICON, icon, { pixelRatio: 2 })
        map.addSource(SOURCE, {
          type: 'geojson',
          data,
          attribution: 'Trees: <a href="https://donnees.montreal.ca/dataset/arbres" target="_blank" rel="noreferrer">Ville de Montréal</a> (CC BY 4.0)',
        })
        // Above the buildings so trees aren't swallowed by them, below the street names.
        map.addLayer(
          {
            id: LAYER,
            type: 'symbol',
            source: SOURCE,
            minzoom: TREES_MIN_ZOOM,
            layout: {
              'icon-image': ICON,
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-pitch-alignment': 'viewport',
              'icon-rotation-alignment': 'viewport',
              'symbol-z-order': 'viewport-y',
              // Bigger trunk, bigger tree; and bigger as you zoom in.
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                ['interpolate', ['linear'], ['get', 'd'], 0, 0.3, 60, 0.6],
                18,
                ['interpolate', ['linear'], ['get', 'd'], 0, 0.7, 60, 1.4],
              ],
            },
            paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], TREES_MIN_ZOOM, 0, TREES_MIN_ZOOM + 0.6, 1] },
          },
          map.getLayer('street-names') ? 'street-names' : undefined,
        )
      })
    }

    map.on('moveend', add)
    add()
    return () => {
      alive = false
      map.off('moveend', add)
      // The map may already be gone (theme switch rebuilds it).
      try {
        if (map.getLayer(LAYER)) map.removeLayer(LAYER)
        if (map.getSource(SOURCE)) map.removeSource(SOURCE)
      } catch {
        // ignore
      }
    }
  }, [map])
}
