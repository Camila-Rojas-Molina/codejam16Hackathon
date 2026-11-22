// Thin wrappers around the browser's camera (getUserMedia) and one-shot GPS (getCurrentPosition),
// with the error cases turned into something the screen can explain. No computer vision: the camera
// only takes the picture; the GPS reading + the server's geofences decide where it belongs.
import type { GpsFix } from '../explore/types'
import { GPS_OPTIONS, VIDEO_CONSTRAINTS } from './config'
import type { GpsProblem } from './captureMachine'

export type CameraProblem = 'insecure' | 'unsupported' | 'denied' | 'not_found' | 'busy' | 'unknown'

export const CAMERA_MESSAGES: Record<CameraProblem, string> = {
  insecure: 'The camera only works on a secure (https) connection. You can still pick a photo instead.',
  unsupported: 'This browser can’t open the camera here. You can still take or pick a photo instead.',
  denied:
    'MIGO isn’t allowed to use the camera. Allow it for this site in your browser settings (on iPhone: Settings › Safari › Camera), or take a photo with your phone’s camera instead.',
  not_found: 'No camera was found on this device. You can pick a photo instead.',
  busy: 'The camera is busy in another app or tab. Close it and try again, or pick a photo instead.',
  unknown: 'The camera couldn’t start. Try again, or pick a photo instead.',
}

/** Why the camera can't be opened at all, before even asking. */
export function cameraUnavailable(): CameraProblem | null {
  if (typeof window === 'undefined') return 'unsupported'
  if (!window.isSecureContext) return 'insecure'
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  return null
}

const errorName = (e: unknown) => (e instanceof DOMException || e instanceof Error ? e.name : '')

export function cameraProblem(e: unknown): CameraProblem {
  switch (errorName(e)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'not_found'
    case 'NotReadableError':
    case 'AbortError':
      return 'busy'
    default:
      return 'unknown'
  }
}

/**
 * Opens the camera: the preferred facing and ~1080p first; if that camera/size doesn't exist, any
 * camera at all. Call it straight from a tap (iOS only allows it from a user gesture).
 */
export async function openCamera(facing: 'environment' | 'user' = 'environment'): Promise<MediaStream> {
  const first: MediaTrackConstraints = { ...VIDEO_CONSTRAINTS, facingMode: { ideal: facing } }
  try {
    return await navigator.mediaDevices.getUserMedia({ video: first, audio: false })
  } catch (e) {
    const name = errorName(e)
    if (name !== 'NotFoundError' && name !== 'OverconstrainedError') throw e
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  for (const t of stream?.getTracks() ?? []) t.stop()
}

/** How many cameras there are (labels/ids are only complete after permission was given). */
export async function countCameras(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput').length
  } catch {
    return 0
  }
}

/**
 * One GPS reading, never a cached one and never watchPosition. The request is made synchronously
 * inside this call, so calling it from the shutter handler keeps it in the same user gesture.
 */
export function requestFix(onFix: (fix: GpsFix) => void, onProblem: (p: GpsProblem) => void) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onProblem('unsupported')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        positionAt: pos.timestamp || Date.now(),
      }),
    (err) => onProblem(err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'),
    GPS_OPTIONS,
  )
}
