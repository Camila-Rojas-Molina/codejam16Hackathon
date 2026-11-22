// The MAP tab's workspace. The interactive 3D map (Google Maps JavaScript API, photorealistic 3D
// tiles) isn't built yet: it mounts into `mapRootRef`, which sits on top of the "on its way"
// sheet below and covers it once something is drawn there.
//
// Integration notes for the map work:
//   * Key: config.googleMapsApiKey (VITE_GOOGLE_MAPS_API_KEY). Treat a missing key gracefully.
//   * The workspace already fills the available height on every screen size and is labelled for
//     screen readers. Put map controls inside it; keep the dashboard chrome as it is.
//   * Give the map root a background (or remove the pending sheet) once the map renders.
//   * Mode-aware context is available from useStore(): activeTrip(profile) for Tourist mode,
//     profile.local for Local mode. Never use GPS to decide someone's home city.
import { useRef } from 'react'
import { Mascot } from '../../components/illustrations/Mascot'
import { cn } from '../../lib/cn'

export default function MapWorkspace({ className }: { className?: string }) {
  const mapRootRef = useRef<HTMLDivElement>(null)
  return (
    <section aria-label="Map" className={cn('relative flex min-h-[22rem] flex-1 overflow-hidden border-2 border-ink bg-teal-soft shadow-block', className)}>
      {/* Pending: shown until the map is built. */}
      <div className="hatch-soft absolute inset-0 grid place-items-center p-6">
        <div className="sheet-grain flex max-w-sm flex-col items-center gap-3 border-2 border-ink p-5 text-center shadow-block-sm">
          <Mascot pose="search" className="h-28 sm:h-36" />
          <p className="eyebrow">Coming soon</p>
          <p className="font-serif text-lg leading-snug">The interactive 3D map isn’t switched on yet. Migo’s still scouting the streets.</p>
        </div>
      </div>
      <div ref={mapRootRef} data-map-root className="absolute inset-0" />
    </section>
  )
}
