// The signed-in person's visited MIGO landmarks (explore_my_discoveries, 007). Loaded only when
// photos are available online; on any error the gallery simply leaves the summary out.
import { useEffect, useState } from 'react'
import { myDiscoveries } from '../explore/api'
import type { Discovery } from '../explore/types'

/** `photoCount` is a reload signal: when the number of photos changes, the visits are fetched again. */
export function useDiscoveries(enabled: boolean, photoCount: number): Discovery[] | null {
  const [state, setState] = useState<{ key: string; list: Discovery[] | null } | null>(null)
  const key = enabled ? String(photoCount) : null

  useEffect(() => {
    if (!key) return
    let cancelled = false
    myDiscoveries()
      .then((list) => !cancelled && setState({ key, list }))
      .catch(() => !cancelled && setState({ key, list: null }))
    return () => {
      cancelled = true
    }
  }, [key])

  // Keep showing the previous list while a reload runs, so the strip doesn't flicker.
  return key && state ? state.list : null
}
