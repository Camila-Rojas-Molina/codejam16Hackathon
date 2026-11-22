// MIGO's own MapLibre style over OpenFreeMap's vector tiles (OpenMapTiles schema). A printed
// city-atlas look in the app's palette: cream paper land, soft teal water with an ink shoreline,
// ink roads (major ones outlined), grass and woods textures, wave marks on the water, muted land
// use, dashed ink rail, hillshaded 3D terrain (Mont-Royal rises), warm 3D buildings, a paper →
// saffron horizon, and only place and street names: no POIs or shop icons. Textures are drawn on
// a canvas and added with map.addImage on 'styleimagemissing' (see textureImage).
// Colours come from the CSS tokens (styles/index.css), so Day and Night each get their variant;
// the map is rebuilt when the theme changes.
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'
import { readToken } from './camera'

/** fill-pattern images, added with map.addImage on 'styleimagemissing'. */
export const TEXTURES = { grass: 'migo-grass', woods: 'migo-woods', water: 'migo-water' } as const
export type TextureId = (typeof TEXTURES)[keyof typeof TEXTURES]

/** AWS Terrain Tiles (open data, no key). Two sources: one for the 3D terrain, one for hillshade. */
export const TERRAIN_SOURCE = 'terrain-dem'
const HILLSHADE_SOURCE = 'hillshade-dem'
export const TERRAIN = { source: TERRAIN_SOURCE, exaggeration: 1.6 }
const TERRAIN_ATTRIBUTION = 'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen Terrain Tiles (AWS Open Data)</a>'
const demSource = () => ({
  type: 'raster-dem' as const,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium' as const,
  tileSize: 256,
  maxzoom: 15,
  attribution: TERRAIN_ATTRIBUTION,
})
/** Sources whose tile errors must not count as "the map failed" (terrain is a nice-to-have). */
export const OPTIONAL_SOURCES = [TERRAIN_SOURCE, HILLSHADE_SOURCE]

/** Ids of our own overlay layers, drawn under the buildings. */
export const FIRST_BUILDING_LAYER = 'building-3d'

export type MapPalette = {
  ink: string
  paper: string
  sheet: string
  water: string
  park: string
  parkDark: string
  parkLight: string
  wood: string
  woodDark: string
  waterInk: string
  shoreGlow: string
  saffronSoft: string
  residential: string
  commercial: string
  industrial: string
  institution: string
  buildingLow: string
  buildingHigh: string
  sky: string
  geofence: string
  accuracy: string
}

function hex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return [128, 128, 128]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** a → b by t (0..1), as #rrggbb. */
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`
}

export function readPalette(): MapPalette {
  const ink = readToken('--color-ink', '#264653')
  const paper = readToken('--color-paper', '#f3ebd5')
  const sheet = readToken('--color-sheet', '#fbf6e8')
  const teal = readToken('--color-teal', '#2a9d8f')
  const tealSoft = readToken('--color-teal-soft', '#cfe9e4')
  const saffron = readToken('--color-saffron', '#e9c46a')
  const sandy = readToken('--color-sandy', '#f4a261')
  const sandySoft = readToken('--color-sandy-soft', '#fbddc0')
  const sienna = readToken('--color-sienna', '#e76f51')
  const green = mix(teal, saffron, 0.4)
  return {
    ink,
    paper,
    sheet,
    water: tealSoft,
    park: mix(paper, green, 0.32),
    parkDark: mix(paper, green, 0.75),
    parkLight: mix(paper, green, 0.12),
    wood: mix(paper, green, 0.5),
    woodDark: mix(mix(paper, green, 0.85), ink, 0.25),
    waterInk: mix(tealSoft, ink, 0.45),
    shoreGlow: mix(tealSoft, sheet, 0.6),
    saffronSoft: readToken('--color-saffron-soft', '#f7e7bc'),
    residential: mix(paper, sandy, 0.07),
    commercial: mix(paper, sienna, 0.08),
    industrial: mix(paper, ink, 0.07),
    institution: mix(paper, teal, 0.09),
    buildingLow: mix(paper, sandySoft, 0.7),
    buildingHigh: mix(sandySoft, sienna, 0.28),
    sky: paper,
    geofence: readToken('--color-teal-deep', '#1e7268'),
    accuracy: teal,
  }
}

type Texture = { width: number; height: number; data: Uint8ClampedArray }

/** A tiny repeatable pseudo-random sequence, so textures look the same every time. */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/** Draws `mark` at (x, y) and at its wrapped copies, so the tile repeats without seams. */
function tile(size: number, draw: (ctx: CanvasRenderingContext2D, mark: (x: number, y: number, fn: (x: number, y: number) => void) => void) => void): Texture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const mark = (x: number, y: number, fn: (x: number, y: number) => void) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) fn(x + dx, y + dy)
  }
  draw(ctx, mark)
  return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data }
}

/** The canvas textures, at 2× pixels (added with pixelRatio 2). Transparent between the marks. */
export function textureImage(id: string, p: MapPalette): Texture | null {
  const rnd = seeded(id.length * 7919)
  if (id === TEXTURES.grass) {
    // Small tufts: three short strokes, in a darker and a lighter green.
    return tile(64, (ctx, mark) => {
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      for (let i = 0; i < 14; i++) {
        const x = rnd() * 64
        const y = rnd() * 64
        ctx.strokeStyle = i % 3 === 0 ? p.parkLight : p.parkDark
        ctx.globalAlpha = 0.75
        mark(x, y, (cx, cy) => {
          ctx.beginPath()
          ctx.moveTo(cx - 3, cy - 4)
          ctx.lineTo(cx - 1, cy + 2)
          ctx.moveTo(cx, cy - 5)
          ctx.lineTo(cx, cy + 2)
          ctx.moveTo(cx + 3, cy - 4)
          ctx.lineTo(cx + 1, cy + 2)
          ctx.stroke()
        })
      }
    })
  }
  if (id === TEXTURES.woods) {
    // Denser canopy: overlapping round blobs with a darker shaded edge.
    return tile(48, (ctx, mark) => {
      for (let i = 0; i < 16; i++) {
        const x = rnd() * 48
        const y = rnd() * 48
        const r = 4 + rnd() * 4
        mark(x, y, (cx, cy) => {
          ctx.globalAlpha = 0.55
          ctx.fillStyle = p.woodDark
          ctx.beginPath()
          ctx.arc(cx + 1.5, cy + 1.5, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.7
          ctx.fillStyle = p.wood
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fill()
        })
      }
    })
  }
  if (id === TEXTURES.water) {
    // Sparse "~" wave marks.
    return tile(96, (ctx, mark) => {
      ctx.strokeStyle = p.waterInk
      ctx.lineWidth = 1.8
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.55
      for (let i = 0; i < 5; i++) {
        const x = rnd() * 96
        const y = rnd() * 96
        mark(x, y, (cx, cy) => {
          ctx.beginPath()
          ctx.moveTo(cx - 6, cy)
          ctx.quadraticCurveTo(cx - 3, cy - 3.5, cx, cy)
          ctx.quadraticCurveTo(cx + 3, cy + 3.5, cx + 6, cy)
          ctx.stroke()
        })
      }
    })
  }
  return null
}

const withAlpha = (c: string, a: number) => {
  const [r, g, b] = hex(c)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const zoomWidth = (stops: [number, number | ExpressionSpecification][]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()] as ExpressionSpecification

const roadClass = (major: number, primary: number, other: number): ExpressionSpecification => [
  'match',
  ['get', 'class'],
  ['motorway', 'trunk'],
  major,
  ['primary', 'secondary'],
  primary,
  other,
]

const notTunnel: ExpressionSpecification = ['!=', ['get', 'brunnel'], 'tunnel']
const MAJOR = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']
const MINOR = ['minor', 'service', 'track']

const name: ExpressionSpecification = ['coalesce', ['get', 'name'], ['get', 'name:latin']]

/** `terrain`: start with the 3D terrain on (tilted view) or off (flat 2D view). */
export function buildMapStyle(p: MapPalette, { terrain = true }: { terrain?: boolean } = {}): StyleSpecification {
  return {
    version: 8,
    name: 'MIGO atlas',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      [TERRAIN_SOURCE]: demSource(),
      [HILLSHADE_SOURCE]: demSource(),
    },
    ...(terrain ? { terrain: TERRAIN } : {}),
    sky: {
      'sky-color': p.sky,
      'horizon-color': p.saffronSoft,
      'fog-color': mix(p.paper, p.saffronSoft, 0.5),
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.35,
      'atmosphere-blend': 0,
    },
    light: { anchor: 'viewport', color: '#ffffff', intensity: 0.32, position: [1.2, 205, 35] },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': p.paper } },

      // ---- Land use and green ----------------------------------------------------------
      {
        id: 'landuse',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            ['residential', 'suburb', 'quarter', 'neighbourhood'],
            p.residential,
            ['commercial', 'retail'],
            p.commercial,
            ['industrial', 'railway', 'garages', 'quarry', 'dam'],
            p.industrial,
            ['school', 'university', 'college', 'kindergarten', 'hospital', 'library'],
            p.institution,
            ['cemetery', 'pitch', 'playground', 'stadium', 'track', 'zoo', 'theme_park'],
            p.park,
            p.paper,
          ],
          'fill-opacity': 0.9,
        },
      },
      {
        id: 'landcover-green',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['match', ['get', 'class'], ['grass', 'wood', 'farmland', 'wetland'], true, false],
        paint: { 'fill-color': ['match', ['get', 'class'], 'wood', p.wood, p.park], 'fill-opacity': ['match', ['get', 'class'], 'wood', 0.95, 0.8] },
      },
      { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': p.park } },
      {
        id: 'park-grass',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        minzoom: 12,
        paint: { 'fill-pattern': TEXTURES.grass, 'fill-opacity': 0.7 },
      },
      {
        id: 'landcover-grass',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 12,
        filter: ['all', ['==', ['get', 'class'], 'grass'], ['!=', ['get', 'subclass'], 'golf_course']],
        paint: { 'fill-pattern': TEXTURES.grass, 'fill-opacity': 0.6 },
      },
      {
        id: 'landcover-woods',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 11,
        filter: ['match', ['get', 'class'], ['wood', 'forest'], true, false],
        paint: { 'fill-pattern': TEXTURES.woods, 'fill-opacity': 0.85 },
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: HILLSHADE_SOURCE,
        paint: {
          'hillshade-shadow-color': withAlpha(p.ink, 0.35),
          'hillshade-highlight-color': withAlpha(p.paper, 0.6),
          'hillshade-accent-color': withAlpha(p.parkDark, 0.5),
          'hillshade-exaggeration': 0.4,
          'hillshade-illumination-direction': 315,
        },
      },
      {
        id: 'aeroway',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'aeroway',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': p.industrial },
      },

      // ---- Water ---------------------------------------------------------------------
      { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', filter: notTunnel, paint: { 'fill-color': p.water } },
      {
        id: 'water-waves',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        minzoom: 11,
        filter: notTunnel,
        paint: { 'fill-pattern': TEXTURES.water, 'fill-opacity': 0.8 },
      },
      {
        id: 'water-glow',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: notTunnel,
        paint: { 'line-color': p.shoreGlow, 'line-width': zoomWidth([[9, 3], [16, 12]]), 'line-blur': zoomWidth([[9, 2], [16, 8]]), 'line-opacity': 0.45 },
      },
      {
        id: 'water-shore',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: notTunnel,
        paint: { 'line-color': p.ink, 'line-width': zoomWidth([[9, 0.6], [16, 1.8]]), 'line-opacity': 0.85 },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        filter: notTunnel,
        paint: { 'line-color': p.water, 'line-width': zoomWidth([[10, 0.8], [18, 6]]) },
      },

      // ---- Rail and roads ------------------------------------------------------------
      {
        id: 'rail',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['==', ['get', 'class'], 'rail'], notTunnel],
        paint: { 'line-color': p.ink, 'line-width': zoomWidth([[11, 0.8], [18, 2.4]]), 'line-dasharray': [3, 2], 'line-opacity': 0.75 },
      },
      {
        id: 'path',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 15,
        filter: ['all', ['match', ['get', 'class'], ['path', 'pedestrian'], true, false], notTunnel],
        paint: { 'line-color': p.ink, 'line-width': zoomWidth([[15, 0.6], [19, 1.6]]), 'line-dasharray': [1.5, 1.5], 'line-opacity': 0.45 },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['all', ['match', ['get', 'class'], MINOR, true, false], notTunnel],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.ink, 'line-width': zoomWidth([[12, 0.3], [16, 2], [19, 7]]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 15, 0.6] },
      },
      {
        id: 'road-major-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['get', 'class'], MAJOR, true, false], notTunnel],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': p.ink,
          'line-width': zoomWidth([
            [10, roadClass(1.4, 0.9, 0.4)],
            [14, roadClass(4.5, 3.4, 2.2)],
            [18, roadClass(20, 15, 11)],
          ]),
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 13, 0.95],
        },
      },
      {
        id: 'road-major-fill',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: ['all', ['match', ['get', 'class'], MAJOR, true, false], notTunnel],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], mix(p.sheet, p.ink, 0.06), p.sheet],
          'line-width': zoomWidth([
            [13, roadClass(1.6, 1, 0.4)],
            [14, roadClass(2.6, 1.8, 0.9)],
            [18, roadClass(16, 11.5, 8)],
          ]),
        },
      },

      // ---- 3D buildings --------------------------------------------------------------
      {
        id: FIRST_BUILDING_LAYER,
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, p.buildingLow, 60, p.buildingHigh],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['coalesce', ['get', 'render_height'], 0]],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['coalesce', ['get', 'render_min_height'], 0]],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true,
        },
      },

      // ---- Labels: street names up close, neighbourhoods and places ---------------------
      {
        id: 'street-names',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 15,
        filter: ['match', ['get', 'class'], [...MAJOR, 'minor'], true, false],
        layout: {
          'symbol-placement': 'line',
          'text-field': name,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 19, 14],
          'text-max-angle': 30,
        },
        paint: { 'text-color': p.ink, 'text-halo-color': p.paper, 'text-halo-width': 1.6 },
      },
      {
        id: 'place-neighbourhood',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 12,
        maxzoom: 17,
        filter: ['match', ['get', 'class'], ['suburb', 'neighbourhood', 'quarter'], true, false],
        layout: {
          'text-field': name,
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 13],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.14,
          'text-max-width': 8,
        },
        paint: { 'text-color': p.ink, 'text-halo-color': p.paper, 'text-halo-width': 1.8, 'text-opacity': 0.8 },
      },
      {
        id: 'place-town',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        maxzoom: 14,
        filter: ['match', ['get', 'class'], ['city', 'town', 'village'], true, false],
        layout: {
          'text-field': name,
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 12, 13, 18],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
        },
        paint: { 'text-color': p.ink, 'text-halo-color': p.paper, 'text-halo-width': 2 },
      },
    ],
  }
}
