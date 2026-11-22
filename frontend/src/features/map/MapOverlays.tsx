// Shapes drawn on the map itself: the selected landmark's geofence (its polygon, or the photo
// radius as a circle) and the one-shot "you are here" dot with its accuracy circle.
// Google's shapes need literal colours, so they read the theme tokens and redraw on theme change.
import { AdvancedMarker, Circle, Polygon } from '@vis.gl/react-google-maps'
import { useMemo } from 'react'
import { useTheme } from '../../lib/theme'
import type { LandmarkDetail } from '../explore/types'
import { cssToken, polygonPaths } from './geo'

function useShapeColours() {
  const { theme } = useTheme()
  return useMemo(
    () => ({
      // theme is a dependency on purpose: the tokens resolve differently by night.
      theme,
      ink: cssToken('--color-ink', '#264653'),
      teal: cssToken('--color-teal', '#2a9d8f'),
      sienna: cssToken('--color-sienna', '#e76f51'),
    }),
    [theme],
  )
}

export function GeofenceShape({ landmark }: { landmark: LandmarkDetail }) {
  const c = useShapeColours()
  const paths = useMemo(() => (landmark.polygon ? polygonPaths(landmark.polygon) : null), [landmark.polygon])

  if (paths && paths.length > 0) {
    return (
      <Polygon
        paths={paths}
        strokeColor={c.ink}
        strokeOpacity={0.9}
        strokeWeight={2.5}
        fillColor={c.teal}
        fillOpacity={0.2}
        clickable={false}
        zIndex={1}
      />
    )
  }
  return (
    <Circle
      center={{ lat: landmark.lat, lng: landmark.lng }}
      radius={landmark.geofenceRadiusM}
      strokeColor={c.ink}
      strokeOpacity={0.9}
      strokeWeight={2.5}
      fillColor={c.teal}
      fillOpacity={0.2}
      clickable={false}
      zIndex={1}
    />
  )
}

export type UserFix = { lat: number; lng: number; accuracyM: number }

export function UserLocation({ fix }: { fix: UserFix }) {
  const c = useShapeColours()
  const position = { lat: fix.lat, lng: fix.lng }
  return (
    <>
      <Circle
        center={position}
        radius={fix.accuracyM}
        strokeColor={c.sienna}
        strokeOpacity={0.8}
        strokeWeight={1.5}
        fillColor={c.sienna}
        fillOpacity={0.12}
        clickable={false}
        zIndex={2}
      />
      <AdvancedMarker position={position} title={`You are here (within about ${Math.round(fix.accuracyM)} m)`} zIndex={3000} anchorLeft="-50%" anchorTop="-50%">
        <span className="relative grid size-6 place-items-center" aria-hidden>
          <span className="absolute inset-0 animate-ring rounded-full bg-sienna opacity-60" />
          <span className="relative size-4 rounded-full border-[3px] border-sheet bg-sienna shadow-[0_0_0_2px_var(--color-ink)]" />
        </span>
      </AdvancedMarker>
    </>
  )
}
