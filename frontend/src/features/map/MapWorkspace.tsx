// The MAP tab's workspace. Intentionally empty for now: the interactive 3D map (Google Maps
// JavaScript API, photorealistic 3D tiles) mounts into `mapRootRef` when it's built.
//
// Integration notes for the map work:
//   * Key: config.googleMapsApiKey (VITE_GOOGLE_MAPS_API_KEY). Treat a missing key gracefully.
//   * The workspace already fills the available height on every screen size and is labelled for
//     screen readers. Put map controls inside it; keep the dashboard chrome as it is.
//   * Mode-aware context is available from useStore(): activeTrip(profile) for Tourist mode,
//     profile.local for Local mode. Never use GPS to decide someone's home city.
import { useRef } from 'react'

export default function MapWorkspace() {
  const mapRootRef = useRef<HTMLDivElement>(null)
  return (
    <section aria-label="Map" className="relative flex min-h-80 flex-1 overflow-hidden border-2 border-ink bg-teal-soft">
      <div ref={mapRootRef} data-map-root className="absolute inset-0" />
    </section>
  )
}
