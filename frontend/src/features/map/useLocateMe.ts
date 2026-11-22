// "Locate me": ONE reading, taken only when the person taps the button. Never watchPosition, no
// background tracking; the dot stays where that one reading put it until they tap again.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ISLAND_BOUNDS, inBounds } from './geo'
import type { LatLng } from './types'

export type UserFix = LatLng & { accuracyM: number }

export type LocateState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'found'; fix: UserFix; note: string | null }
  | { status: 'error'; message: string }

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }

function failure(e: GeolocationPositionError): string {
  if (e.code === e.PERMISSION_DENIED) return 'Location is turned off for MIGO. Allow it in your browser’s site settings, then try again.'
  if (e.code === e.TIMEOUT) return 'Finding you took too long. Try again, ideally outdoors.'
  return 'Your position isn’t available right now. Check that location services are on, then try again.'
}

export function useLocateMe(onFound: (fix: UserFix) => void) {
  const [state, setState] = useState<LocateState>({ status: 'idle' })
  const live = useRef(true)
  const found = useRef(onFound)
  useEffect(() => {
    found.current = onFound
  }, [onFound])
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const locate = useCallback(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setState({ status: 'error', message: 'Your location can only be read over a secure (https) connection.' })
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'error', message: 'This browser can’t share your location.' })
      return
    }
    setState({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!live.current) return
        const fix: UserFix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy) }
        const note = inBounds(fix, ISLAND_BOUNDS) ? null : 'You seem to be off Montréal Island. MIGO’s landmarks are all on the island.'
        setState({ status: 'found', fix, note })
        found.current(fix)
      },
      (e) => {
        if (live.current) setState({ status: 'error', message: failure(e) })
      },
      OPTIONS,
    )
  }, [])

  /** Hides the message (keeps the dot). */
  const dismiss = useCallback(() => setState((s) => (s.status === 'error' ? { status: 'idle' } : s.status === 'found' ? { ...s, note: null } : s)), [])

  return { state, locate, dismiss }
}
