// Montréal's public trees (Ville de Montréal open data, "Arbres publics", CC BY 4.0) as real 3D
// trees at street zoom: a trunk and a rounded canopy built from stacked extrusions, drawn in the
// same 3D pass as the buildings, so a building in front hides the tree behind it, and they stand
// on the 3D terrain. Size comes from the trunk diameter; each tree gets its own shade of green.
// The data is a compact [lng, lat, trunkCm][] file made by scripts/build-trees.mjs, downloaded
// the first time someone zooms in close enough. Only the trees around the view are built.
import { useEffect } from 'react'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

const SOURCE = 'migo-trees'
const LAYER = 'migo-trees'
/** Trees appear from this zoom (clouds are gone by then). */
export const TREES_MIN_ZOOM = 15
const DATA_URL = '/data/trees.json'
/** At most this many trees are built at once (the closest to the view's centre win). */
const MAX_TREES = 3500
/** Polygon sides for trunk and canopy rings. */
const SIDES = 10

type Row = [number, number, number]
let cached: Promise<Row[] | null> | null = null
function loadTrees(): Promise<Row[] | null> {
  cached ??= fetch(DATA_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((rows: Row[] | null) => (Array.isArray(rows) ? rows : null))
    .catch(() => null)
  return cached
}

const GREENS = ['#5f8f4e', '#6e9b56', '#58864a', '#7aa35f', '#4f7d45', '#83a866']
const TRUNK = '#6b4f3a'

type Feature = {
  type: 'Feature'
  properties: { base: number; top: number; color: string }
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

function ring(lng: number, lat: number, radiusM: number, phase: number): [number, number][] {
  const dLat = radiusM / 111320
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180))
  const pts: [number, number][] = []
  for (let i = 0; i <= SIDES; i++) {
    const a = phase + (i / SIDES) * Math.PI * 2
    pts.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat])
  }
  return pts
}

/** A tree as extrusions: trunk, then canopy tiers (wide middle, narrower top) for a rounded crown. */
function treeFeatures([lng, lat, d]: Row, out: Feature[]) {
  // Deterministic per-tree variation from its position.
  const h = Math.abs(Math.sin(lng * 91731 + lat * 4517)) // 0..1
  const size = Math.max(0.75, Math.min(1.9, 0.75 + d / 45)) * (0.9 + h * 0.2)
  const trunkTop = 2.6 * size
  const crownH = 7.5 * size
  const r = 2.6 * size
  const color = GREENS[Math.floor(h * GREENS.length) % GREENS.length]
  const phase = h * Math.PI
  const poly = (radius: number, base: number, top: number, c: string) =>
    out.push({ type: 'Feature', properties: { base, top, color: c }, geometry: { type: 'Polygon', coordinates: [ring(lng, lat, radius, phase)] } })
  poly(0.28 * size, 0, trunkTop + 0.5, TRUNK)
  poly(r * 0.75, trunkTop, trunkTop + crownH * 0.25, color)
  poly(r, trunkTop + crownH * 0.18, trunkTop + crownH * 0.62, color)
  poly(r * 0.78, trunkTop + crownH * 0.55, trunkTop + crownH * 0.85, color)
  poly(r * 0.45, trunkTop + crownH * 0.8, trunkTop + crownH, color)
}

function buildAround(map: MapLibreMap, rows: Row[]) {
  const b = map.getBounds()
  const padLng = (b.getEast() - b.getWest()) * 0.25
  const padLat = (b.getNorth() - b.getSouth()) * 0.25
  const c = map.getCenter()
  const inView = rows.filter(
    ([lng, lat]) => lng > b.getWest() - padLng && lng < b.getEast() + padLng && lat > b.getSouth() - padLat && lat < b.getNorth() + padLat,
  )
  if (inView.length > MAX_TREES) {
    inView.sort((a, z) => (a[0] - c.lng) ** 2 + (a[1] - c.lat) ** 2 - ((z[0] - c.lng) ** 2 + (z[1] - c.lat) ** 2))
    inView.length = MAX_TREES
  }
  const features: Feature[] = []
  for (const row of inView) treeFeatures(row, features)
  return { type: 'FeatureCollection' as const, features }
}

export function useTrees(map: MapLibreMap | null) {
  useEffect(() => {
    if (!map) return
    let alive = true
    let rows: Row[] | null = null
    let loading = false

    const update = () => {
      if (map.getZoom() < TREES_MIN_ZOOM - 0.5) return
      if (!rows) {
        if (loading) return
        loading = true
        loadTrees().then((r) => {
          if (!alive || !r) return
          rows = r
          update()
        })
        return
      }
      const data = buildAround(map, rows)
      const src = map.getSource<GeoJSONSource>(SOURCE)
      if (src) {
        src.setData(data)
        return
      }
      map.addSource(SOURCE, {
        type: 'geojson',
        data,
        attribution: 'Trees: <a href="https://donnees.montreal.ca/dataset/arbres" target="_blank" rel="noreferrer">Ville de Montréal</a> (CC BY 4.0)',
      })
      // Right after the buildings, in the same 3D pass, so depth between them is correct.
      map.addLayer(
        {
          id: LAYER,
          type: 'fill-extrusion',
          source: SOURCE,
          minzoom: TREES_MIN_ZOOM,
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], TREES_MIN_ZOOM, ['get', 'base'], TREES_MIN_ZOOM + 0.6, ['get', 'top']],
            'fill-extrusion-opacity': 1,
            'fill-extrusion-vertical-gradient': true,
          },
        },
        map.getLayer('street-names') ? 'street-names' : undefined,
      )
    }

    map.on('moveend', update)
    update()
    return () => {
      alive = false
      map.off('moveend', update)
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
