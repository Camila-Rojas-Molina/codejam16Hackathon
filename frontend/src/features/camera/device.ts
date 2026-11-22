// Browser plumbing for the camera: the media stream, one-frame capture, the fallback picker and
// one-shot GPS readings. No React here; CameraPage wires these to the capture machine.
import type { GpsFix } from '../explore/types'
import { fitWithin, ImageReadError, JPEG_QUALITY, MAX_UPLOAD_BYTES, prepareImage } from '../gallery/image'
import type { CameraError, GeoFailure, Shot } from './captureMachine'
import { GPS_TIMEOUT_MS, MAX_PICKED_FILE_AGE_MS, VIDEO_CONSTRAINTS } from './config'

export type Facing = 'environment' | 'user'

/** Why the live camera can't even be tried here, or null when it can. */
export function cameraUnavailable(): CameraError | null {
  if (typeof window === 'undefined') return 'unsupported'
  // Browsers hide navigator.mediaDevices on plain http (except localhost).
  if (!window.isSecureContext) return 'insecure'
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  return null
}

const errorName = (e: unknown) => (e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '')

export function classifyCameraError(e: unknown): CameraError {
  switch (errorName(e)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'not_allowed'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not_found'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'not_readable'
    default:
      return 'unknown'
  }
}

/**
 * Opens the camera facing `facing` (a preference, not a demand). If no camera matches the
 * constraints (NotFound / Overconstrained), tries once more with any camera at all.
 */
export async function openCameraStream(facing: Facing): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO_CONSTRAINTS, facingMode: { ideal: facing } }, audio: false })
  } catch (e) {
    const name = errorName(e)
    if (name !== 'NotFoundError' && name !== 'OverconstrainedError') throw e
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop())
}

/** Number of cameras (labels are only exposed after permission, but the count is enough). */
export async function countVideoInputs(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput').length
  } catch {
    return 0
  }
}

/**
 * Draws the video's current frame onto a canvas, already downscaled to ≤ MAX_EDGE_PX, so the
 * full-resolution frame is never kept or uploaded. Synchronous: call it in the shutter handler.
 */
export function drawFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const { width, height } = fitWithin(vw, vh)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(video, 0, 0, width, height)
  return canvas
}

/** JPEG-encodes a drawn frame. A canvas re-encode carries no EXIF, so no location leaves the phone. */
export async function encodeFrame(canvas: HTMLCanvasElement): Promise<Shot> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new ImageReadError('This photo couldn’t be prepared. Try again.')
  if (blob.size > MAX_UPLOAD_BYTES) throw new ImageReadError('This photo is too large to upload.')
  return { blob, previewUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height, source: 'camera' }
}

/** A picture from the camera app: same shrink and EXIF strip as uploads (features/gallery/image.ts). */
export async function shotFromFile(file: File): Promise<Shot> {
  const image = await prepareImage(file)
  return { blob: image.blob, previewUrl: URL.createObjectURL(image.blob), width: image.width, height: image.height, source: 'file' }
}

/** False for a picked file that was clearly made earlier (see MAX_PICKED_FILE_AGE_MS). */
export function isFreshPick(file: File, now = Date.now()): boolean {
  return !file.lastModified || now - file.lastModified <= MAX_PICKED_FILE_AGE_MS
}

export function toGpsFix(pos: GeolocationPosition): GpsFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyM: pos.coords.accuracy,
    // The reading's own time, not "now": the server checks how old it is.
    positionAt: pos.timestamp,
  }
}

export function classifyGeoError(err: GeolocationPositionError): GeoFailure {
  if (err.code === err.PERMISSION_DENIED) return 'denied'
  if (err.code === err.TIMEOUT) return 'timeout'
  return 'unavailable'
}

/**
 * One fresh, high-accuracy reading (never watchPosition, never a cached one). Calls back exactly
 * once. Call it straight from the user's tap so the permission prompt belongs to that gesture.
 */
export function readLocationOnce(onFix: (fix: GpsFix) => void, onError: (e: GeoFailure) => void) {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    queueMicrotask(() => onError('unsupported'))
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => onFix(toGpsFix(pos)),
    (err) => onError(classifyGeoError(err)),
    { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS },
  )
}
