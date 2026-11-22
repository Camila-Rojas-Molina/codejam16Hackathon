// Loads one landmark's full details (landmark_get) by id or slug, for the details sheet, the
// geofence shape and deep links (/map?landmark=…), whether or not it's in the current viewport.
import { useCallback, useEffect, useState } from 'react'
import { getLandmark, isBackendConfigured } from '../explore/api'
import type { LandmarkDetail } from '../explore/types'

export type LandmarkDetailState = {
  detail: LandmarkDetail | null
  loading: boolean
  error: string | null
  notFound: boolean
  retry: () => void
}

type Result = { request: string; idOrSlug: string; detail: LandmarkDetail | null; error: string | null }

/** `refreshToken` re-fetches in place (keeping the shown details), e.g. after returning from the camera. */
export function useLandmarkDetail(idOrSlug: string | null, refreshToken = 0): LandmarkDetailState {
  const configured = isBackendConfigured()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const request = `${idOrSlug}|${attempt}|${refreshToken}`

  useEffect(() => {
    if (!idOrSlug || !configured) return
    let live = true
    const done = (detail: LandmarkDetail | null, error: string | null) => live && setResult({ request, idOrSlug, detail, error })
    getLandmark(idOrSlug).then(
      (d) => done(d, null),
      (e: unknown) => done(null, e instanceof Error ? e.message : 'Could not load this landmark.'),
    )
    return () => {
      live = false
    }
  }, [configured, idOrSlug, request])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Results for another landmark are dropped at once; a refresh of this one keeps the old details.
  const current = idOrSlug && result?.idOrSlug === idOrSlug ? result : null
  const settled = current?.request === request
  return {
    detail: current?.detail ?? null,
    loading: Boolean(idOrSlug && configured && !settled),
    error: settled ? current.error : null,
    notFound: Boolean(settled && !current.error && !current.detail),
    retry,
  }
}
