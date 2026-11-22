// Calls `refresh` when the person comes back to the page (tab visible again or window focused),
// e.g. after taking a photo in another tab, so visited pins are current. At most every few seconds.
import { useEffect, useRef } from 'react'

const MIN_GAP_MS = 4000

export function useRefreshOnReturn(refresh: () => void) {
  const latest = useRef(refresh)
  useEffect(() => {
    latest.current = refresh
  }, [refresh])

  useEffect(() => {
    let last = Date.now()
    const onReturn = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_GAP_MS) return
      last = Date.now()
      latest.current()
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [])
}
