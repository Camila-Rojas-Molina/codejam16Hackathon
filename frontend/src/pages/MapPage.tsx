// MAP: MIGO's main exploration space. The 3D map isn't built yet; see features/map/MapWorkspace.tsx.
import MapWorkspace from '../features/map/MapWorkspace'

export default function MapPage() {
  return (
    <div className="flex flex-1 flex-col lg:max-h-[calc(100dvh-4rem)]">
      <h1 className="sr-only">Map</h1>
      <MapWorkspace />
    </div>
  )
}
