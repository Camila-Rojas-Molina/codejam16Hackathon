// What the camera screen says, kept apart from the layout. Plain functions of the machine state.
import type { CameraError, CaptureState, RetryInfo } from './captureMachine'

const isIOS = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

export function cameraErrorText(e: CameraError): { title: string; body: string } {
  switch (e) {
    case 'not_allowed':
      return {
        title: 'Camera access is off',
        body: isIOS()
          ? 'Allow the camera for this site: tap “aA” in the address bar, then Website Settings › Camera › Allow. Or use your camera app below.'
          : 'Allow the camera for this site: tap the icon next to the address, then Permissions › Camera › Allow. Or use your camera app below.',
      }
    case 'not_found':
      return { title: 'No camera found', body: 'This device didn’t offer a camera to the browser. You can still use your camera app below.' }
    case 'not_readable':
      return { title: 'The camera is busy', body: 'Another app may be using it. Close it and try again, or use your camera app below.' }
    case 'insecure':
      return { title: 'Camera needs a secure page', body: 'The live camera only works over https. Use your camera app below instead.' }
    case 'unsupported':
      return { title: 'No live camera in this browser', body: 'Use your camera app below instead.' }
    default:
      return { title: 'The camera didn’t start', body: 'Try again, or use your camera app below.' }
  }
}

const round = (m: number) => `±${Math.round(m)} m`

/** Title, explanation and whether a new reading can help (vs. only retaking the photo). */
export function retryText(r: RetryInfo): { title: string; body: string; accuracy: string | null; canRetry: boolean; preferRetake: boolean } {
  const accuracy =
    r.accuracyM !== null ? `GPS accuracy: ${round(r.accuracyM)}${r.maxAccuracyM !== null ? ` (needs ${round(r.maxAccuracyM)} or better)` : ''}` : null
  switch (r.cause) {
    case 'denied':
      return {
        title: 'Location is off for MIGO',
        body: isIOS()
          ? 'To link this photo to a place, allow location: Settings › Privacy & Security › Location Services › Safari Websites › While Using the App. Then tap Try again.'
          : 'To link this photo to a place, allow location: tap the icon next to the address, then Permissions › Location › Allow. Then tap Try again.',
        accuracy: null,
        canRetry: true,
        preferRetake: false,
      }
    case 'unsupported':
      return { title: 'No location on this device', body: 'This browser can’t share a location, so the photo can’t be linked to a place.', accuracy: null, canRetry: false, preferRetake: false }
    case 'timeout':
      return { title: 'Location took too long', body: 'Your phone couldn’t find its position in time. Step outside or near a window and try again.', accuracy: null, canRetry: true, preferRetake: false }
    case 'unavailable':
      return { title: 'Location unavailable', body: 'Your phone couldn’t find its position. Check that location is on, then try again.', accuracy: null, canRetry: true, preferRetake: false }
    case 'poor_accuracy':
      return { title: 'Location too vague', body: 'Your GPS reading isn’t precise enough yet. Wait a few seconds in the open and try again.', accuracy, canRetry: true, preferRetake: false }
    default: {
      // The server's words; a capture gap means the photo itself is too old for a new reading.
      const preferRetake = r.serverReason === 'capture_gap'
      return {
        title: preferRetake ? 'Take the photo again' : 'Location couldn’t be confirmed',
        body: r.message ?? 'Your location couldn’t be confirmed. Try again.',
        accuracy,
        canRetry: !preferRetake,
        preferRetake,
      }
    }
  }
}

/** One line for the aria-live region. */
export function statusLine(s: CaptureState, landmarkName: (id: string | null) => string | null): string {
  switch (s.phase) {
    case 'idle':
      return s.starting ? 'Starting the camera…' : s.cameraError ? cameraErrorText(s.cameraError).title : ''
    case 'previewing':
      return 'Camera ready.'
    case 'capturing':
      return 'Photo taken. Getting your location…'
    case 'locating':
      return 'Getting your location…'
    case 'checking':
      return 'Checking where you are…'
    case 'needs_choice':
      return 'Several MIGO places are nearby. Pick the one in your photo.'
    case 'ready_to_save': {
      const name = landmarkName(s.landmarkId)
      return name ? `This photo will be saved at ${name}.` : 'No MIGO place here. This photo will be saved as a Montréal memory.'
    }
    case 'retry_location':
      return retryText(s.retry).title
    case 'outside_area':
      return 'Outside Montréal Island. The photo was not uploaded.'
    case 'error':
      return s.message
    case 'uploading':
      return 'Saving your photo…'
    case 'saved':
      return s.result.landmark ? `Saved at ${s.result.landmark.name}.${s.result.newDiscovery ? ' New discovery!' : ''}` : 'Saved as a Montréal memory.'
  }
}
