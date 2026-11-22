// Client-side knobs for the camera (/camera). The server (007, explore_check_location and
// explore_register_capture) is the authority on accuracy, freshness and the capture↔fix gap; these
// only shape the experience. Change them here, not in components.

/** How long one GPS reading may take before we offer "Retry location". */
export const GPS_TIMEOUT_MS = 15_000

/**
 * Skip the server check when the fix is obviously too vague: true uses the accuracy limit the server
 * reported on its last check this session (unknown before the first one). The server still decides.
 */
export const CLIENT_ACCURACY_PREFILTER = true

/**
 * Fallback picker ("Use camera app"): pictures older than this are refused here, so an old library
 * photo isn't passed off as taken now. They can still be added through the Gallery's Upload.
 * Heuristic: it relies on File.lastModified, which some browsers set to the moment of picking.
 */
export const MAX_PICKED_FILE_AGE_MS = 5 * 60_000

/** The rear camera at up to 1080p. The frame is downscaled to MAX_EDGE_PX before upload anyway. */
export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

/** Shown before the first location use, above the shutter, so the browser's prompt makes sense. */
export const LOCATION_EXPLAINER =
  'We use your current location once, when you take a photo, to link it to a nearby MIGO place. We don’t track you.'
