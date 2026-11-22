// The Google map engine (the fallback to the 3D MapLibre map, or the choice with
// VITE_MAP_ENGINE=google). Pins are AdvancedMarkers; the selected landmark's geofence is a
// google.maps Polygon/Circle; everything around the map is MapFrame. If the Maps script fails
// (bad key, blocked), it falls back to the list-only CatalogueOnly.
/// <reference types="google.maps" />
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Circle,
  ColorScheme,
  ControlPosition,
  Map as GoogleMap,
  Polygon,
  useApiLoadingStatus,
  useMap,
  type MapEvent,
} from '@vis.gl/react-google-maps'
import { config } from '../../lib/config'
import { useTheme } from '../../lib/theme'
import type { Bounds, LandmarkSummary } from '../explore/types'
import { focusPadding, isPhoneLayout, lastCamera, readToken } from './camera'
import CatalogueOnly from './CatalogueOnly'
import { DEFAULT_ZOOM, FOCUS_ZOOM, ISLAND_BOUNDS, LOCATE_ZOOM, nearIsland, boundsOf, polygonPaths } from './geo'
import { pinDescription, pinState } from './landmarkMeta'
import { isCoarsePointer } from './layout'
import MapFrame from './MapFrame'
import { ClusterBubble, LandmarkMarker, UserDot } from './Pins'
import type { LatLng } from './types'
import { useLocateMe } from './useLocateMe'
import { useMapExplorer } from './useMapExplorer'

const IDLE_DEBOUNCE_MS = 300

/** Moves a point into the part of the map the sheet doesn't cover. */
function revealPoint(map: google.maps.Map, p: LatLng, minZoom: number) {
  map.panTo(p)
  if ((map.getZoom() ?? 0) < minZoom) map.setZoom(minZoom)
  if (isPhoneLayout()) map.panBy(0, Math.round(map.getDiv().clientHeight * 0.22))
  else map.panBy(190, 0)
}

function useOverlayColours() {
  const { theme } = useTheme()
  return useMemo(() => {
    void theme
    return { geofence: readToken('--color-teal-deep', '#1f5c5c'), accuracy: readToken('--color-teal', '#3a8f8a') }
  }, [theme])
}

export default function GoogleMapView({ className }: { className?: string }) {
  if (!config.googleMapsApiKey) return <CatalogueOnly reason="missing-key" className={className} />
  return (
    <APIProvider apiKey={config.googleMapsApiKey} region="CA">
      <LiveMap className={className} />
    </APIProvider>
  )
}

function LiveMap({ className }: { className?: string }) {
  const status = useApiLoadingStatus()
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) return <CatalogueOnly reason="load-failed" className={className} />
  return <GoogleExplorer className={className} />
}

function GoogleExplorer({ className }: { className?: string }) {
  const map = useMap()
  const { theme } = useTheme()
  const colours = useOverlayColours()
  const [coarse] = useState(isCoarsePointer)
  const ex = useMapExplorer()
  const { onViewChange, selected, ready, focused, selectedSummary } = ex
  const idleTimer = useRef<number | undefined>(undefined)

  // ---- Viewport → landmarks -------------------------------------------------------------
  const onIdle = useCallback(
    (e: MapEvent) => {
      const m = e.map
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        const b = m.getBounds()?.toJSON()
        const center = m.getCenter()?.toJSON()
        const zoom = m.getZoom() ?? DEFAULT_ZOOM
        if (!b) return
        if (center) Object.assign(lastCamera, { center, zoom })
        const bounds: Bounds = { west: b.west, south: b.south, east: b.east, north: b.north }
        onViewChange({ bounds, zoom })
      }, IDLE_DEBOUNCE_MS)
    },
    [onViewChange],
  )
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  // Deep link: centre on the landmark once its details (and coordinates) arrive.
  useEffect(() => {
    if (!map || !selected?.focus || !ready) return
    const outline = ready.polygon ? boundsOf(polygonPaths(ready.polygon).flat()) : null
    if (outline) map.fitBounds(outline, focusPadding(map.getDiv().clientHeight))
    else revealPoint(map, ready, FOCUS_ZOOM)
    focused()
  }, [map, selected?.focus, ready, focused])

  const onOpenFromList = (l: LandmarkSummary) => {
    if (map) revealPoint(map, l, Math.max(map.getZoom() ?? 0, 15))
  }

  const zoomInto = (members: LandmarkSummary[], at: LatLng) => {
    if (!map) return
    const b = boundsOf(members)
    const zoom = map.getZoom() ?? DEFAULT_ZOOM
    if (!b || (b.east - b.west < 1e-5 && b.north - b.south < 1e-5)) {
      map.panTo(at)
      map.setZoom(Math.min(zoom + 3, 20))
    } else map.fitBounds(b, 64)
  }

  // ---- Locate me (one reading per tap) --------------------------------------------------
  const locate = useLocateMe()
  const fix = locate.state.status === 'found' ? locate.state.fix : null

  // Each new reading moves the camera there; far off the island the message explains instead.
  useEffect(() => {
    if (!map || !fix || !nearIsland(fix)) return
    map.setZoom(LOCATE_ZOOM)
    map.panTo(fix)
  }, [map, fix])

  return (
    <MapFrame ex={ex} locate={locate} onOpenFromList={onOpenFromList} className={className}>
      <GoogleMap
        key={theme}
        className="absolute inset-0"
        defaultCenter={lastCamera.center}
        defaultZoom={lastCamera.zoom}
        minZoom={10}
        mapId={config.googleMapsMapId || 'DEMO_MAP_ID'}
        colorScheme={theme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
        restriction={{ latLngBounds: ISLAND_BOUNDS, strictBounds: false }}
        gestureHandling={coarse ? 'greedy' : 'auto'}
        disableDefaultUI
        zoomControl={!coarse}
        zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
        clickableIcons={false}
        onIdle={onIdle}
      >
        {ex.items.map((item) =>
          item.kind === 'landmark' ? (
            <AdvancedMarker
              key={item.key}
              position={item.landmark}
              title={pinDescription(item.landmark)}
              zIndex={item.landmark.recommended ? 2 : 1}
              onClick={() => ex.openFromMap(item.landmark)}
            >
              <LandmarkMarker state={pinState(item.landmark)} category={item.landmark.category} />
            </AdvancedMarker>
          ) : (
            <AdvancedMarker
              key={item.key}
              position={item.position}
              title={`${item.members.length} landmarks here, ${item.visited} visited. Zoom in.`}
              zIndex={3}
              anchorLeft="-50%"
              anchorTop="-50%"
              onClick={() => zoomInto(item.members, item.position)}
            >
              <ClusterBubble count={item.members.length} visited={item.visited} recommended={item.recommended > 0} />
            </AdvancedMarker>
          ),
        )}

        {selectedSummary && (
          <AdvancedMarker position={selectedSummary} title={pinDescription(selectedSummary)} zIndex={10} onClick={() => ex.openFromMap(selectedSummary)}>
            <LandmarkMarker state={pinState(selectedSummary)} category={selectedSummary.category} selected />
          </AdvancedMarker>
        )}

        {/* The selected landmark's geofence: its area, or the circle around it. */}
        {ready?.polygon ? (
          <Polygon paths={polygonPaths(ready.polygon)} strokeColor={colours.geofence} strokeWeight={2} fillColor={colours.geofence} fillOpacity={0.16} clickable={false} />
        ) : (
          selectedSummary &&
          !selectedSummary.hasPolygon && (
            <Circle
              center={selectedSummary}
              radius={selectedSummary.geofenceRadiusM}
              strokeColor={colours.geofence}
              strokeWeight={2}
              fillColor={colours.geofence}
              fillOpacity={0.16}
              clickable={false}
            />
          )
        )}

        {fix && (
          <>
            <Circle center={fix} radius={fix.accuracyM} strokeColor={colours.accuracy} strokeWeight={1} fillColor={colours.accuracy} fillOpacity={0.15} clickable={false} />
            <AdvancedMarker position={fix} title={`You are here (within about ${fix.accuracyM} m)`} zIndex={20} anchorLeft="-50%" anchorTop="-50%">
              <UserDot />
            </AdvancedMarker>
          </>
        )}
      </GoogleMap>
    </MapFrame>
  )
}
