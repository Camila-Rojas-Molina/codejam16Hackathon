// Viewport-aware landmark loading for the map. Every active landmark in view comes back (never
// filtered to recommendations); the user's visited / recommended flags ride along.
//   * Viewports are snapped to a ~1 km grid and cached per mount, so panning back is instant.
//   * While a new viewport loads, the previous markers stay on screen.
//   * When the page regains focus or visibility (e.g. back from the camera), the cache is dropped
//     and the current viewport re-queried, so a fresh capture shows as visited.
import { useCallback, useEffect, useState } from 'react'
import { isBackendConfigured, landmarksInView } from '../explore/api'
import type { Bounds, LandmarkSummary } from '../explore/types'
import { boundsKey, parseBoundsKey, snapBounds } from './geo'

/** Matches the RPC's default cap. Reaching it means "zoom in to see everything". */
const LIMIT = 3000
const CACHE_SIZE = 40

export type LandmarksState = {
  configured: boolean
  landmarks: LandmarkSummary[]
  loading: boolean
  error: string | null
  /** The server returned its maximum: some landmarks in view may be missing. */
  truncated: boolean
  retry: () => void
  /** Bumps on every focus/visibility refresh, so other views (the details sheet) can re-fetch. */
  refreshToken: number
}

type Cache = ReadonlyMap<string, LandmarkSummary[]>

export function useLandmarksInView(bounds: Bounds | null): LandmarksState {
  const configured = isBackendConfigured()
  const [cache, setCache] = useState<Cache>(() => new Map())
  const [shown, setShown] = useState<LandmarkSummary[]>([])
  const [failure, setFailure] = useState<{ key: string; attempt: number; message: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)

  const key = bounds ? boundsKey(snapBounds(bounds)) : null
  const hit = key ? cache.get(key) : undefined
  // Show the cached viewport when there is one; otherwise keep the previous pins while loading.
  if (hit && hit !== shown) setShown(hit)

  const failed = failure !== null && failure.key === key && failure.attempt === attempt
  const needsFetch = configured && key !== null && !hit && !failed

  useEffect(() => {
    if (!needsFetch || !key) return
    let live = true
    landmarksInView(parseBoundsKey(key), LIMIT).then(
      (rows) => {
        if (!live) return
        setCache((c) => {
          const next = new Map(c).set(key, rows)
          if (next.size > CACHE_SIZE) next.delete(next.keys().next().value as string)
          return next
        })
      },
      (e: unknown) => live && setFailure({ key, attempt, message: e instanceof Error ? e.message : 'Could not load landmarks.' }),
    )
    return () => {
      live = false
    }
  }, [needsFetch, key, attempt])

  // Re-query on return to the page (focus and visibilitychange both fire; collapse them).
  useEffect(() => {
    let last = 0
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 2000) return
      last = Date.now()
      setCache(new Map())
      setRefreshToken((n) => n + 1)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const landmarks = hit ?? shown

  return {
    configured,
    landmarks,
    loading: needsFetch,
    error: failed ? failure.message : null,
    truncated: landmarks.length >= LIMIT,
    retry,
    refreshToken,
  }
}
