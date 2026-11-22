// Landmarks for the map's viewport (landmarks_in_view): every active landmark, never only the
// recommended ones. Requests are snapped to a grid and cached by area for this visit; the previous
// pins stay on screen while a new area loads, and a late answer for an old area is ignored.
import { useCallback, useRef, useState } from 'react'
import { isBackendConfigured } from '../../lib/backend'
import { landmarksInView } from '../explore/api'
import type { Bounds, LandmarkSummary } from '../explore/types'
import { boundsKey, fetchArea } from './geo'

export type LandmarksStatus = 'unconfigured' | 'idle' | 'loading' | 'ready' | 'error'

const CACHE_SIZE = 40

export const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong.')

export function useLandmarks() {
  const configured = isBackendConfigured()
  const cache = useRef(new Map<string, LandmarkSummary[]>())
  const request = useRef(0)
  const lastView = useRef<Bounds | null>(null)
  const [landmarks, setLandmarks] = useState<LandmarkSummary[]>([])
  const [status, setStatus] = useState<LandmarksStatus>(configured ? 'idle' : 'unconfigured')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (view: Bounds, force = false) => {
      if (!configured) return
      lastView.current = view
      const area = fetchArea(view)
      const id = ++request.current
      if (!area) {
        setLandmarks([])
        setStatus('ready')
        setError(null)
        return
      }
      const key = boundsKey(area)
      const hit = force ? undefined : cache.current.get(key)
      if (hit) {
        setLandmarks(hit)
        setStatus('ready')
        setError(null)
        return
      }
      setStatus('loading')
      try {
        const rows = await landmarksInView(area)
        cache.current.set(key, rows)
        if (cache.current.size > CACHE_SIZE) cache.current.delete(cache.current.keys().next().value as string)
        if (id !== request.current) return
        setLandmarks(rows)
        setStatus('ready')
        setError(null)
      } catch (e) {
        if (id !== request.current) return
        setStatus('error')
        setError(errorText(e))
      }
    },
    [configured],
  )

  /** Same area again, skipping the cache (after an error). */
  const retry = useCallback(() => {
    if (lastView.current) void load(lastView.current, true)
  }, [load])

  /** Forget everything cached (visited flags may have changed) and reload the current area. */
  const refresh = useCallback(() => {
    cache.current.clear()
    if (lastView.current) void load(lastView.current, true)
  }, [load])

  return { landmarks, status, error, load, retry, refresh }
}
