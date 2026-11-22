// Full details for the selected landmark (landmark_get), by id or slug. A reload keeps the current
// details on screen until the fresh copy arrives (used when the page regains focus).
import { useCallback, useEffect, useState } from 'react'
import { isBackendConfigured } from '../../lib/backend'
import { getLandmark } from '../explore/api'
import type { LandmarkDetail } from '../explore/types'
import { errorText } from './useLandmarks'

export type DetailState =
  | { status: 'loading'; detail: null; error: null }
  | { status: 'ready'; detail: LandmarkDetail; error: null }
  | { status: 'missing'; detail: null; error: null }
  | { status: 'error'; detail: null; error: string }

type Entry = { key: string; state: DetailState }

const LOADING: DetailState = { status: 'loading', detail: null, error: null }
const OFFLINE: DetailState = { status: 'error', detail: null, error: 'Landmark details need MIGO’s online service, which isn’t connected here.' }

export function useLandmarkDetail(key: string | null) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!key || !isBackendConfigured()) return
    let live = true
    getLandmark(key).then(
      (detail) => {
        if (live) setEntry({ key, state: detail ? { status: 'ready', detail, error: null } : { status: 'missing', detail: null, error: null } })
      },
      (e: unknown) => {
        if (!live) return
        // A failed background reload keeps what is already shown.
        setEntry((prev) => (prev?.key === key && prev.state.status === 'ready' ? prev : { key, state: { status: 'error', detail: null, error: errorText(e) } }))
      },
    )
    return () => {
      live = false
    }
  }, [key, nonce])

  /** Fetch again in the background, keeping what's shown. */
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  /** Fetch again from scratch (after an error), showing the loading state. */
  const retry = useCallback(() => {
    setEntry(null)
    setNonce((n) => n + 1)
  }, [])
  const state: DetailState | null = !key ? null : !isBackendConfigured() ? OFFLINE : entry?.key === key ? entry.state : LOADING
  return { state, reload, retry }
}
