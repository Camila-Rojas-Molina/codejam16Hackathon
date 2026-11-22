// Landmark markers on the Google map, clustered with @googlemaps/markerclusterer.
// Each landmark is a React AdvancedMarker (so the pin is real JSX with design tokens); the
// marker instances register with one clusterer, which hides the ones it groups. Clusters are
// square ink stamps with the count, plus a teal tick count when some of them are visited.
/// <reference types="google.maps" />
import { MarkerClusterer, SuperClusterAlgorithm, type Cluster, type Renderer } from '@googlemaps/markerclusterer'
import { AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { memo, useCallback, useEffect, useRef } from 'react'
import type { LandmarkSummary } from '../explore/types'
import { categoryOf, pinStateLabel } from './geo'
import LandmarkPin from './LandmarkPin'

type Props = {
  landmarks: LandmarkSummary[]
  selectedId: string | null
  onSelect: (l: LandmarkSummary) => void
}

/** Which markers are visited, so cluster stamps can show a visited count. */
const visitedMarkers = new WeakSet<google.maps.marker.AdvancedMarkerElement>()

function clusterRenderer(markerLib: google.maps.MarkerLibrary): Renderer {
  return {
    render({ count, position, markers }: Cluster) {
      const visited = (markers ?? []).filter((m) => visitedMarkers.has(m as google.maps.marker.AdvancedMarkerElement)).length
      const el = document.createElement('div')
      el.className =
        'grid min-h-11 min-w-11 place-items-center border-2 border-ink bg-ink px-2 font-display text-base leading-none text-sheet shadow-block-sm'
      el.textContent = String(count)
      if (visited > 0) {
        const tick = document.createElement('span')
        tick.className = 'day-island mt-0.5 block border border-ink bg-teal px-1 font-sans text-[0.6rem] font-bold tracking-wider text-ink'
        tick.textContent = `✓ ${visited}`
        el.appendChild(tick)
      }
      return new markerLib.AdvancedMarkerElement({
        position,
        content: el,
        title: `${count} landmarks${visited ? `, ${visited} visited` : ''}. Zoom in`,
        zIndex: 1000 + count,
      })
    },
  }
}

export default function LandmarkMarkers({ landmarks, selectedId, onSelect }: Props) {
  const map = useMap()
  const markerLib = useMapsLibrary('marker')
  const clusterer = useRef<MarkerClusterer | null>(null)
  // Every mounted marker, so a clusterer created after them (child effects run first) gets them all.
  const registry = useRef(new Set<google.maps.marker.AdvancedMarkerElement>())
  const frame = useRef(0)

  useEffect(() => {
    if (!map || !markerLib) return
    const c = new MarkerClusterer({
      map,
      markers: [...registry.current],
      renderer: clusterRenderer(markerLib),
      // Group from 4 pins up, and stop grouping at street level so every pin is reachable.
      algorithm: new SuperClusterAlgorithm({ radius: 64, maxZoom: 15, minPoints: 4 }),
    })
    clusterer.current = c
    return () => {
      cancelAnimationFrame(frame.current)
      c.clearMarkers(true)
      c.setMap(null)
      clusterer.current = null
    }
  }, [map, markerLib])

  // Markers come and go one by one as React mounts them; redraw the clusters once per frame.
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => clusterer.current?.render())
  }, [])

  const register = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement, visited: boolean, pinned: boolean) => {
      if (visited) visitedMarkers.add(marker)
      else visitedMarkers.delete(marker)
      // The selected pin stays out of the clusters, so it never disappears into a stamp.
      if (pinned) {
        marker.map = map
        return () => {}
      }
      registry.current.add(marker)
      clusterer.current?.addMarker(marker, true)
      scheduleRender()
      return () => {
        registry.current.delete(marker)
        clusterer.current?.removeMarker(marker, true)
        scheduleRender()
      }
    },
    [map, scheduleRender],
  )

  return (
    <>
      {landmarks.map((l) => (
        <LandmarkMarker key={l.id} landmark={l} selected={l.id === selectedId} onSelect={onSelect} register={register} />
      ))}
    </>
  )
}

type MarkerProps = {
  landmark: LandmarkSummary
  selected: boolean
  onSelect: (l: LandmarkSummary) => void
  register: (m: google.maps.marker.AdvancedMarkerElement, visited: boolean, pinned: boolean) => () => void
}

const LandmarkMarker = memo(function LandmarkMarker({ landmark: l, selected, onSelect, register }: MarkerProps) {
  const unregister = useRef<(() => void) | null>(null)
  // A ref callback re-registers when visited/selected change, so clusters and counts stay right.
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => {
      unregister.current?.()
      unregister.current = marker ? register(marker, l.visited, selected) : null
    },
    [register, l.visited, selected],
  )

  return (
    <AdvancedMarker
      ref={ref}
      position={{ lat: l.lat, lng: l.lng }}
      title={`${l.name}. ${categoryOf(l.category).label}. ${pinStateLabel(l)}`}
      zIndex={selected ? 2000 : l.recommended ? 20 : l.visited ? 10 : 1}
      onClick={() => onSelect(l)}
      className="cursor-pointer px-1.5 pt-1"
    >
      <LandmarkPin visited={l.visited} recommended={l.recommended} category={l.category} selected={selected} />
    </AdvancedMarker>
  )
})
