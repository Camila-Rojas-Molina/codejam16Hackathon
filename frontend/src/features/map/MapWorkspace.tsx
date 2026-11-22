// The MAP tab's workspace: picks the map engine and falls back when it can't run.
//   1. MapLibre 3D map on OpenFreeMap tiles (default; VITE_MAP_ENGINE=google skips it)
//   2. Google map, when a key is set (no WebGL, or MapLibre's style/tiles failed or timed out)
//   3. CatalogueOnly: every landmark as a list, with the same details and camera link
// Both engines are lazy-loaded so their code (maplibre-gl, Google's loader) stays out of the
// main bundle. Everything around the map is shared: see MapFrame and useMapExplorer.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { config } from '../../lib/config'
import CatalogueOnly from './CatalogueOnly'
import { supportsWebGL } from './layout'
import MapLoading from './MapLoading'

type EngineState = { engine: 'maplibre' } | { engine: 'google' } | { engine: 'list'; reason: 'missing-key' | 'load-failed' | 'no-map' }

type MapLibreProps = { className?: string; onFail: (reason: string) => void }

/** If the engine's code can't be downloaded (offline, new deploy), fall back like any failure. */
function ChunkFailed({ onFail }: MapLibreProps) {
  useEffect(() => onFail('chunk'), [onFail])
  return <MapLoading />
}

const MapLibreView = lazy(() => import('./MapLibreView').catch(() => ({ default: ChunkFailed })))
const GoogleMapView = lazy(() =>
  import('./GoogleMapView').catch(() => ({ default: ({ className }: { className?: string }) => <CatalogueOnly reason="load-failed" className={className} /> })),
)

const afterMapLibre = (): EngineState => (config.googleMapsApiKey ? { engine: 'google' } : { engine: 'list', reason: 'no-map' })

function initialEngine(): EngineState {
  if (config.mapEngine === 'google') return config.googleMapsApiKey ? { engine: 'google' } : { engine: 'list', reason: 'missing-key' }
  return supportsWebGL() ? { engine: 'maplibre' } : afterMapLibre()
}

export default function MapWorkspace({ className }: { className?: string }) {
  const [state, setState] = useState<EngineState>(initialEngine)

  const onMapLibreFail = useCallback((reason: string) => {
    console.warn(`[map] 3D map unavailable (${reason}); falling back.`)
    setState((s) => (s.engine === 'maplibre' ? afterMapLibre() : s))
  }, [])

  if (state.engine === 'list') return <CatalogueOnly reason={state.reason} className={className} />
  return (
    <Suspense fallback={<MapLoading className={className} />}>
      {state.engine === 'maplibre' ? <MapLibreView className={className} onFail={onMapLibreFail} /> : <GoogleMapView className={className} />}
    </Suspense>
  )
}
