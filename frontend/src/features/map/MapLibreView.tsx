// The primary map engine: a tilted 3D MapLibre map on OpenFreeMap tiles in MIGO's own style
// (mapStyle.ts). No key needed. Same features as the Google view through useMapExplorer and
// MapFrame: viewport pins with clustering, the details sheet, deep links, the geofence of the
// selected landmark, Locate me, the list and filters. Plus a 2D/3D toggle.
// If the style or tiles fail before the first 'load' (or nothing loads within 12 s), `onFail`
// asks MapWorkspace to switch to the Google map or the list.
import { useEffect, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, NavigationControl, type GeoJSONSource, type PointLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/theme'
import type { Bounds, GeoPolygon, LandmarkSummary } from '../explore/types'
import { DEFAULT_PITCH, isPhoneLayout, focusPadding, lastCamera, prefersReducedMotion } from './camera'
import { FOCUS_ZOOM, ISLAND_BOUNDS, LOCATE_ZOOM, nearIsland, boundsOf, circlePolygon, intersectBounds, polygonPaths } from './geo'
import { pinDescription, pinState } from './landmarkMeta'
import { isCoarsePointer } from './layout'
import MapFrame from './MapFrame'
import MapLibreMarker from './MapLibreMarker'
import WeatherClouds from './WeatherClouds'
import { TREES_MIN_ZOOM, useTrees } from './useTrees'
import { FIRST_BUILDING_LAYER, OPTIONAL_SOURCES, TERRAIN, TEXTURES, buildMapStyle, readPalette, textureImage, type MapPalette } from './mapStyle'
import { ClusterBubble, LandmarkMarker, UserDot } from './Pins'
import type { LatLng } from './types'
import { useLocateMe } from './useLocateMe'
import { useMapExplorer } from './useMapExplorer'

const SETTLE_DEBOUNCE_MS = 300
const LOAD_TIMEOUT_MS = 12000
const GEOFENCE = 'migo-geofence'
const ACCURACY = 'migo-accuracy'

/** Loose limit around the island: you can look past the shore, not wander off to Ottawa. */
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [ISLAND_BOUNDS.west - 0.3, ISLAND_BOUNDS.south - 0.18],
  [ISLAND_BOUNDS.east + 0.3, ISLAND_BOUNDS.north + 0.18],
]

const emptyCollection = { type: 'FeatureCollection' as const, features: [] }
const featureOf = (geometry: GeoPolygon) => ({ type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry }] })

/**
 * What's on screen. With pitch the view is a trapezoid reaching to the horizon, so take the box
 * around the four unprojected canvas corners, cap its far side to a few screen-widths around the
 * centre, and clip it to the island so the horizon doesn't turn into a whole-island query.
 */
function viewBounds(m: MapLibreMap): Bounds {
  const c = m.getCanvas()
  const w = c.clientWidth
  const h = c.clientHeight
  const corners = ([[0, 0], [w, 0], [0, h], [w, h]] as [number, number][]).map((p) => m.unproject(p))
  const box = boundsOf(corners.map((p) => ({ lat: p.lat, lng: p.lng })))!
  const [, , bl, br] = corners
  const across = Math.hypot((br.lng - bl.lng) * Math.cos((bl.lat * Math.PI) / 180), br.lat - bl.lat)
  const halfLat = Math.max(across, 0.004) * 1.6
  const halfLng = halfLat / Math.cos((m.getCenter().lat * Math.PI) / 180)
  const center = m.getCenter()
  const capped = intersectBounds(box, { west: center.lng - halfLng, east: center.lng + halfLng, south: center.lat - halfLat, north: center.lat + halfLat }) ?? box
  return intersectBounds(capped, ISLAND_BOUNDS) ?? capped
}

/** Animated camera moves, or instant ones when the person prefers reduced motion. */
/**
 * On tilted 3D terrain the camera aims at sea level, so a place up a hill (Mont-Royal…) ends up
 * above the middle of the screen. Once the move ends, pan by however far the place actually landed
 * from where it should be (the screen centre, or the centre shifted by `offset`).
 */
function recentreWhenSettled(m: MapLibreMap, at: LatLng, offset?: PointLike) {
  m.once('moveend', () => {
    const want = m.project([at.lng, at.lat])
    const box = m.getContainer()
    const [ox, oy] = Array.isArray(offset) ? offset : offset ? [offset.x, offset.y] : [0, 0]
    const dx = want.x - (box.clientWidth / 2 + ox)
    const dy = want.y - (box.clientHeight / 2 + oy)
    if (Math.hypot(dx, dy) > 12) m.panBy([dx, dy], { duration: prefersReducedMotion() ? 0 : 400 })
  })
}

function moveTo(m: MapLibreMap, center: LatLng, zoom: number, offset?: PointLike) {
  const target = { center: [center.lng, center.lat] as [number, number], zoom, offset }
  recentreWhenSettled(m, center, offset)
  if (prefersReducedMotion()) m.easeTo({ ...target, duration: 0 })
  else m.flyTo({ ...target, essential: false })
}

/** Where a focused point should sit so the sheet doesn't cover it. */
const revealOffset = (m: MapLibreMap): PointLike => (isPhoneLayout() ? [0, -Math.round(m.getContainer().clientHeight * 0.22)] : [-190, 0])

function addOverlays(m: MapLibreMap, p: MapPalette) {
  const before = m.getLayer(FIRST_BUILDING_LAYER) ? FIRST_BUILDING_LAYER : undefined
  m.addSource(GEOFENCE, { type: 'geojson', data: emptyCollection })
  m.addLayer({ id: `${GEOFENCE}-fill`, type: 'fill', source: GEOFENCE, paint: { 'fill-color': p.geofence, 'fill-opacity': 0.18 } }, before)
  m.addLayer({ id: `${GEOFENCE}-line`, type: 'line', source: GEOFENCE, paint: { 'line-color': p.ink, 'line-width': 2.2, 'line-dasharray': [2, 1.2] } }, before)
  m.addSource(ACCURACY, { type: 'geojson', data: emptyCollection })
  m.addLayer({ id: `${ACCURACY}-fill`, type: 'fill', source: ACCURACY, paint: { 'fill-color': p.accuracy, 'fill-opacity': 0.16 } }, before)
  m.addLayer({ id: `${ACCURACY}-line`, type: 'line', source: ACCURACY, paint: { 'line-color': p.accuracy, 'line-width': 1.2 } }, before)
}

export default function MapLibreView({ className, onFail }: { className?: string; onFail: (reason: string) => void }) {
  const { theme } = useTheme()
  const [coarse] = useState(isCoarsePointer)
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [tilted, setTilted] = useState(lastCamera.pitch > 5)
  const loadedOnce = useRef(false)
  const fail = useRef(onFail)
  const ex = useMapExplorer()
  const { onViewChange, selected, ready, focused, selectedSummary } = ex

  // The creation effect reads the latest callbacks through refs.
  const onViewChangeRef = useRef(onViewChange)
  useEffect(() => {
    fail.current = onFail
    onViewChangeRef.current = onViewChange
  }, [onFail, onViewChange])

  // ---- Create the map (again on Day/Night, keeping the camera) ---------------------------
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = readPalette()
    let m: MapLibreMap
    try {
      m = new MapLibreMap({
        container,
        style: buildMapStyle(palette, { terrain: lastCamera.pitch > 5 }),
        center: [lastCamera.center.lng, lastCamera.center.lat],
        zoom: lastCamera.zoom,
        pitch: lastCamera.pitch,
        bearing: lastCamera.bearing,
        minZoom: 10,
        maxPitch: 70,
        maxBounds: MAX_BOUNDS,
        attributionControl: false,
      })
    } catch {
      fail.current('webgl')
      return
    }
    // The tiles' own TileJSON brings the OpenFreeMap / OpenMapTiles / OpenStreetMap credit. Start it
    // folded into the ⓘ button so it doesn't cover the map's buttons on narrow screens.
    m.addControl(new AttributionControl({ compact: true }), 'bottom-left')
    m.once('load', () => m.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
    if (!coarse) m.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')

    m.on('styleimagemissing', (e) => {
      if (!Object.values<string>(TEXTURES).includes(e.id) || m.hasImage(e.id)) return
      const img = textureImage(e.id, palette)
      if (img) m.addImage(e.id, img, { pixelRatio: 2 })
    })

    let timer: number | undefined
    const settle = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const c = m.getCenter()
        Object.assign(lastCamera, { center: { lat: c.lat, lng: c.lng }, zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() })
        onViewChangeRef.current({ bounds: viewBounds(m), zoom: m.getZoom(), project: (p) => m.project([p.lng, p.lat]) })
      }, SETTLE_DEBOUNCE_MS)
    }

    let loaded = false
    const watchdog = loadedOnce.current ? undefined : window.setTimeout(() => !loaded && fail.current('timeout'), LOAD_TIMEOUT_MS)
    m.on('error', (e) => {
      // Terrain tiles are optional: a missing elevation tile only flattens that spot.
      const source = (e as { sourceId?: string }).sourceId
      if (source && OPTIONAL_SOURCES.includes(source)) return
      if (!loaded && !loadedOnce.current) fail.current(e.error?.message || 'error')
    })
    m.on('load', () => {
      loaded = true
      loadedOnce.current = true
      window.clearTimeout(watchdog)
      addOverlays(m, palette)
      setMap(m)
      settle()
    })
    m.on('moveend', settle)
    m.on('pitchend', () => setTilted(m.getPitch() > 5))

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(watchdog)
      setMap(null)
      m.remove()
    }
  }, [theme, coarse])

  // ---- The selected landmark's geofence --------------------------------------------------
  useEffect(() => {
    const src = map?.getSource<GeoJSONSource>(GEOFENCE)
    if (!src) return
    if (ready?.polygon) src.setData(featureOf(ready.polygon))
    else if (selectedSummary && !selectedSummary.hasPolygon) src.setData(featureOf(circlePolygon(selectedSummary, selectedSummary.geofenceRadiusM)))
    else src.setData(emptyCollection)
  }, [map, ready, selectedSummary])

  // Deep link: centre on the landmark once its details arrive (keeping the tilt).
  useEffect(() => {
    if (!map || !selected?.focus || !ready) return
    const outline = ready.polygon ? boundsOf(polygonPaths(ready.polygon).flat()) : null
    if (outline)
      map.fitBounds(
        [
          [outline.west, outline.south],
          [outline.east, outline.north],
        ],
        { padding: focusPadding(map.getContainer().clientHeight), maxZoom: 17.5, pitch: map.getPitch(), bearing: map.getBearing(), duration: prefersReducedMotion() ? 0 : undefined },
      )
    else moveTo(map, ready, Math.max(map.getZoom(), FOCUS_ZOOM), revealOffset(map))
    focused()
  }, [map, selected?.focus, ready, focused])

  const onOpenFromList = (l: LandmarkSummary) => {
    if (map) moveTo(map, l, Math.max(map.getZoom(), 15), revealOffset(map))
  }

  const zoomInto = (members: LandmarkSummary[], at: LatLng) => {
    if (!map) return
    const b = boundsOf(members)
    if (!b || (b.east - b.west < 1e-5 && b.north - b.south < 1e-5)) moveTo(map, at, Math.min(map.getZoom() + 3, 20))
    else
      map.fitBounds(
        [
          [b.west, b.south],
          [b.east, b.north],
        ],
        { padding: 64, maxZoom: 18, pitch: map.getPitch(), bearing: map.getBearing(), duration: prefersReducedMotion() ? 0 : undefined },
      )
  }

  // ---- Locate me (one reading per tap) --------------------------------------------------
  const locate = useLocateMe()
  const fix = locate.state.status === 'found' ? locate.state.fix : null

  // Each new reading moves the camera there (keeping tilt and heading). Far off the island the
  // message explains it and the camera stays put (it couldn't leave the map's limits anyway).
  useEffect(() => {
    if (!map || !fix || !nearIsland(fix)) return
    map.stop()
    const target = { center: [fix.lng, fix.lat] as [number, number], zoom: LOCATE_ZOOM, pitch: map.getPitch(), bearing: map.getBearing() }
    recentreWhenSettled(map, fix)
    if (prefersReducedMotion()) map.jumpTo(target)
    else map.flyTo({ ...target, duration: 1400, essential: true })
  }, [map, fix])

  useEffect(() => {
    map?.getSource<GeoJSONSource>(ACCURACY)?.setData(fix ? featureOf(circlePolygon(fix, fix.accuracyM)) : emptyCollection)
  }, [map, fix])

  useTrees(map)

  // Raised terrain only in the tilted view; the flat 2D view keeps just the hillshade.
  // At street zoom the terrain flattens out (smoothly, over one zoom level) so the trees, which
  // MapLibre can't stand on raised terrain, can show; the hills matter when zoomed out anyway.
  useEffect(() => {
    if (!map) return
    let last = -1
    const apply = () => {
      const k = tilted ? Math.round(Math.max(0, Math.min(1, TREES_MIN_ZOOM - 0.2 - map.getZoom())) * 10) / 10 : 0
      if (k === last) return
      last = k
      map.setTerrain(k > 0 ? { ...TERRAIN, exaggeration: TERRAIN.exaggeration * k } : null)
    }
    apply()
    map.on('zoom', apply)
    return () => {
      map.off('zoom', apply)
    }
  }, [map, tilted])

  const toggleTilt = () => {
    if (!map) return
    const pitch = tilted ? 0 : DEFAULT_PITCH
    setTilted(!tilted)
    if (prefersReducedMotion()) map.jumpTo({ pitch })
    else map.easeTo({ pitch, duration: 700 })
  }

  const tiltButton = (
    <button
      type="button"
      onClick={toggleTilt}
      aria-label={tilted ? 'Switch to flat 2D map' : 'Switch to tilted 3D map'}
      className="sheet-grain grid size-12 place-items-center border-2 border-ink font-display text-base leading-none shadow-block-sm transition-colors hover:bg-saffron-soft"
    >
      {tilted ? '2D' : '3D'}
    </button>
  )

  return (
    <MapFrame ex={ex} locate={locate} onOpenFromList={onOpenFromList} controls={tiltButton} className={cn('bg-paper', className)}>
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {map && (
        <>
          <WeatherClouds map={map} />
          {ex.items.map((item) =>
            item.kind === 'landmark' ? (
              <MapLibreMarker
                key={item.key}
                map={map}
                position={item.landmark}
                title={pinDescription(item.landmark)}
                zIndex={item.landmark.recommended ? 2 : 1}
                onClick={() => ex.openFromMap(item.landmark)}
              >
                <LandmarkMarker state={pinState(item.landmark)} category={item.landmark.category} />
              </MapLibreMarker>
            ) : (
              <MapLibreMarker
                key={item.key}
                map={map}
                position={item.position}
                anchor="center"
                title={`${item.members.length} landmarks here, ${item.visited} visited. Zoom in.`}
                zIndex={3}
                onClick={() => zoomInto(item.members, item.position)}
              >
                <ClusterBubble count={item.members.length} visited={item.visited} recommended={item.recommended > 0} />
              </MapLibreMarker>
            ),
          )}
          {selectedSummary && (
            <MapLibreMarker map={map} position={selectedSummary} title={pinDescription(selectedSummary)} zIndex={10} onClick={() => ex.openFromMap(selectedSummary)}>
              <LandmarkMarker state={pinState(selectedSummary)} category={selectedSummary.category} selected />
            </MapLibreMarker>
          )}
          {fix && (
            <MapLibreMarker map={map} position={fix} anchor="center" title={`You are here (within about ${fix.accuracyM} m)`} zIndex={20}>
              <UserDot />
            </MapLibreMarker>
          )}
        </>
      )}

      {!map && (
        <div className="hatch-soft absolute inset-0 grid place-items-center" role="status">
          <span className="sheet-grain border-2 border-ink px-4 py-2 text-sm font-semibold shadow-block-sm">
            <Icon name="map" className="mr-2 inline size-5 align-middle" />
            Drawing the map…
          </span>
        </div>
      )}
    </MapFrame>
  )
}
