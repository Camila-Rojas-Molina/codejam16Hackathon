// MAP: MIGO's main exploration space: Montréal Island's landmarks on a 3D map (MapLibre; Google or a
// plain list as fallbacks); see features/map/MapWorkspace.tsx. /map?landmark=<id|slug> opens one.
// Phones: a context line, then the map fills the screen. Laptops and up: the map with a details
// column beside it.
import MapPanel, { MapContextBar } from '../features/map/MapPanel'
import MapWorkspace from '../features/map/MapWorkspace'

export default function MapPage() {
  return (
    <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
      <h1 className="sr-only">Map</h1>
      <MapContextBar className="lg:hidden" />
      <MapWorkspace className="lg:min-h-[32rem]" />
      <MapPanel className="hidden lg:flex" />
    </div>
  )
}
