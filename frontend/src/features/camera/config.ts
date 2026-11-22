// Client-side settings for the camera screen. The server's limits (explore_check_location →
// LocationCheck.limits: accuracy, position age, capture↔fix gap) are the ones that count; these only
// shape the experience. Images use the gallery's own size/quality (features/gallery/image.ts).

/** One GPS reading per shutter press: how long to wait for it. */
export const GPS_TIMEOUT_MS = 15_000

/** Always a fresh reading: never a cached position. */
export const GPS_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS }

/** Back camera first, about Full HD. The frame is scaled down to ≤ 1600 px before it's kept. */
export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

/** Shown before the first capture. */
export const LOCATION_NOTICE = 'We use your location once, when you take a photo, to link it to a nearby MIGO place. We don’t track you.'

/** localStorage: the person has taken a photo here before (the notice is then shorter). */
export const NOTICE_SEEN_KEY = 'migo:camera:noticeSeen'

/** Name for "Save to device" downloads. */
export const downloadName = (capturedAt: number) => `migo-${new Date(capturedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`

/** "120 m", "1.4 km". */
export const formatDistance = (m: number) => (m < 1000 ? `${Math.max(1, Math.round(m))} m` : `${(m / 1000).toFixed(1)} km`)
