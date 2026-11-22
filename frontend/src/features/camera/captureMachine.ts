// The capture flow as a pure reducer, so every transition is explicit and testable without a
// browser. Side effects (camera, GPS, network) live in CameraPage; they dispatch results tagged
// with the shot (and GPS attempt) they belong to, and anything stale is ignored.
//
//   idle ──start──▶ previewing ──shutter──▶ capturing (frame encoding ∥ GPS)
//     capturing ──photo──▶ locating (still waiting for GPS) ──fix──▶ checking
//     capturing ──photo, fix already in──▶ checking
//   checking ──▶ needs_choice   ok, several landmarks match: the user picks one (or cancels)
//            ──▶ ready_to_save  ok, one landmark, or none (→ Montréal memory)
//            ──▶ retry_location fix not trusted (server or GPS error): keep photo, read GPS again
//            ──▶ outside_area   not on Montréal Island: nothing is uploaded
//            ──▶ error          network / rate limit: retry the same step
//   needs_choice ──pick + save──▶ uploading;  ready_to_save ──save──▶ uploading ──▶ saved | error
//   Any state with a photo ──discard (retake / cancel)──▶ idle. The photo only lives in memory.
import type { CaptureResult, GpsFix, LocationCheck } from '../explore/types'

/** The captured picture, already downscaled JPEG (≤ 1600 px, no EXIF), held in memory. */
export type Shot = {
  blob: Blob
  /** Object URL for the preview. CameraPage revokes it when the shot is dropped. */
  previewUrl: string
  width: number
  height: number
  source: 'camera' | 'file'
}

export type CameraError = 'not_allowed' | 'not_found' | 'not_readable' | 'insecure' | 'unsupported' | 'unknown'
export type GeoFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export type RetryInfo = {
  cause: GeoFailure | 'poor_accuracy' | 'server'
  /** The server's reason ('poor_accuracy' | 'stale_position' | 'capture_gap' | 'future_timestamp') when it asked. */
  serverReason: string | null
  /** The server's own words when it asked; null for GPS errors (the UI explains those). */
  message: string | null
  accuracyM: number | null
  maxAccuracyM: number | null
}

type Shooting = { shotId: number; capturedAt: number }
type WithPhoto = Shooting & { photo: Shot }
type Checked = WithPhoto & { fix: GpsFix; check: LocationCheck }

type Located = { kind: 'fix'; fix: GpsFix } | { kind: 'retry'; retry: RetryInfo }

export type CheckingState = WithPhoto & { phase: 'checking'; fix: GpsFix }
export type UploadingState = Checked & { phase: 'uploading'; landmarkId: string | null }

export type CaptureState =
  | { phase: 'idle'; starting: boolean; cameraError: CameraError | null }
  | { phase: 'previewing' }
  | (Shooting & { phase: 'capturing'; attempt: number; located: Located | null })
  | (WithPhoto & { phase: 'locating'; attempt: number })
  | CheckingState
  | (Checked & { phase: 'needs_choice'; selectedId: string | null })
  | (Checked & { phase: 'ready_to_save'; landmarkId: string | null })
  | (WithPhoto & { phase: 'retry_location'; attempt: number; retry: RetryInfo })
  | (WithPhoto & { phase: 'outside_area'; message: string })
  | (Shooting & { phase: 'error'; photo: Shot | null; message: string; resume: CheckingState | UploadingState | null; attempt: number })
  | UploadingState
  | (WithPhoto & { phase: 'saved'; result: CaptureResult })

export type CaptureAction =
  | { type: 'CAMERA_STARTING' }
  | { type: 'CAMERA_READY' }
  | { type: 'CAMERA_FAILED'; error: CameraError }
  | { type: 'CAMERA_STOPPED' }
  | { type: 'SHUTTER'; shotId: number; capturedAt: number; attempt: number }
  | { type: 'PHOTO_READY'; shotId: number; photo: Shot }
  | { type: 'PHOTO_FAILED'; shotId: number; message: string }
  | { type: 'FIX'; shotId: number; attempt: number; fix: GpsFix; maxAccuracyM: number | null }
  | { type: 'GEO_ERROR'; shotId: number; attempt: number; error: GeoFailure }
  | { type: 'RETRY_LOCATION'; attempt: number }
  | { type: 'CHECK_RESULT'; shotId: number; check: LocationCheck }
  | { type: 'CHECK_FAILED'; shotId: number; message: string }
  | { type: 'PICK'; landmarkId: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_OK'; shotId: number; result: CaptureResult }
  | { type: 'SAVE_FAILED'; shotId: number; message: string; retryLocation: boolean }
  | { type: 'RETRY' }
  | { type: 'DISCARD' }

export const initialCaptureState: CaptureState = { phase: 'idle', starting: false, cameraError: null }

const geoRetry = (cause: GeoFailure): RetryInfo => ({ cause, serverReason: null, message: null, accuracyM: null, maxAccuracyM: null })

/** A reading too vague to be worth a server round trip (only when the limit is known). */
function located(fix: GpsFix, maxAccuracyM: number | null): Located {
  if (maxAccuracyM !== null && fix.accuracyM > maxAccuracyM) {
    return { kind: 'retry', retry: { cause: 'poor_accuracy', serverReason: 'poor_accuracy', message: null, accuracyM: fix.accuracyM, maxAccuracyM } }
  }
  return { kind: 'fix', fix }
}

function afterLocated(s: WithPhoto, attempt: number, l: Located): CaptureState {
  const base = { shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo }
  return l.kind === 'fix' ? { ...base, phase: 'checking', fix: l.fix } : { ...base, phase: 'retry_location', attempt, retry: l.retry }
}

function afterCheck(s: CheckingState, check: LocationCheck): CaptureState {
  const base = { shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, fix: s.fix, check }
  switch (check.status) {
    case 'ok':
      if (check.ambiguous && check.candidates.length > 0) return { ...base, phase: 'needs_choice', selectedId: null }
      return { ...base, phase: 'ready_to_save', landmarkId: check.resolvedLandmarkId }
    case 'retry':
      return {
        shotId: s.shotId,
        capturedAt: s.capturedAt,
        photo: s.photo,
        phase: 'retry_location',
        attempt: 0,
        retry: {
          cause: 'server',
          serverReason: check.reason,
          message: check.message,
          accuracyM: s.fix.accuracyM,
          maxAccuracyM: check.limits.maxAccuracyM,
        },
      }
    case 'outside_area':
      return { shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, phase: 'outside_area', message: check.message }
    case 'rate_limited':
    default:
      return {
        shotId: s.shotId,
        capturedAt: s.capturedAt,
        photo: s.photo,
        phase: 'error',
        message: check.message || 'Too many photos in a short time. Wait a moment, then try again.',
        resume: s,
        attempt: 0,
      }
  }
}

/** The photo held by the state, if any (for the preview and for revoking its object URL). */
export function heldShot(s: CaptureState): Shot | null {
  return 'photo' in s ? s.photo : null
}

/** The landmark id a save would use: the pick when ambiguous, else the server's resolution. */
export function saveTarget(s: CaptureState): string | null | undefined {
  if (s.phase === 'needs_choice') return s.selectedId ?? undefined
  if (s.phase === 'ready_to_save') return s.landmarkId
  return undefined
}

const sameShot = (s: CaptureState, shotId: number) => 'shotId' in s && s.shotId === shotId

export function captureReducer(s: CaptureState, a: CaptureAction): CaptureState {
  switch (a.type) {
    case 'CAMERA_STARTING':
      return s.phase === 'idle' ? { phase: 'idle', starting: true, cameraError: null } : s
    case 'CAMERA_READY':
      return s.phase === 'idle' ? { phase: 'previewing' } : s
    case 'CAMERA_FAILED':
      return s.phase === 'idle' || s.phase === 'previewing' ? { phase: 'idle', starting: false, cameraError: a.error } : s
    case 'CAMERA_STOPPED':
      return s.phase === 'previewing' || (s.phase === 'idle' && s.starting) ? { phase: 'idle', starting: false, cameraError: null } : s

    case 'SHUTTER':
      // From the live preview, or from idle through the "Use camera app" picker.
      if (s.phase !== 'previewing' && s.phase !== 'idle') return s
      return { phase: 'capturing', shotId: a.shotId, capturedAt: a.capturedAt, attempt: a.attempt, located: null }

    case 'PHOTO_READY': {
      if (s.phase !== 'capturing' || !sameShot(s, a.shotId)) return s
      const withPhoto = { shotId: s.shotId, capturedAt: s.capturedAt, photo: a.photo }
      if (!s.located) return { ...withPhoto, phase: 'locating', attempt: s.attempt }
      return afterLocated(withPhoto, s.attempt, s.located)
    }
    case 'PHOTO_FAILED':
      if (s.phase !== 'capturing' || !sameShot(s, a.shotId)) return s
      return { phase: 'error', shotId: s.shotId, capturedAt: s.capturedAt, photo: null, message: a.message, resume: null, attempt: 0 }

    case 'FIX':
    case 'GEO_ERROR': {
      if (!sameShot(s, a.shotId)) return s
      const l: Located = a.type === 'FIX' ? located(a.fix, a.maxAccuracyM) : { kind: 'retry', retry: geoRetry(a.error) }
      if (s.phase === 'capturing' && s.attempt === a.attempt && !s.located) return { ...s, located: l }
      if (s.phase === 'locating' && s.attempt === a.attempt) return afterLocated(s, s.attempt, l)
      return s
    }
    case 'RETRY_LOCATION':
      // Keeps the photo and its capture time; the new reading must still be close enough to it.
      if ((s.phase !== 'retry_location' && s.phase !== 'error') || !s.photo) return s
      return { phase: 'locating', shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, attempt: a.attempt }

    case 'CHECK_RESULT':
      return s.phase === 'checking' && sameShot(s, a.shotId) ? afterCheck(s, a.check) : s
    case 'CHECK_FAILED':
      if (s.phase !== 'checking' || !sameShot(s, a.shotId)) return s
      return { phase: 'error', shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, message: a.message, resume: s, attempt: 0 }

    case 'PICK':
      if (s.phase !== 'needs_choice' || !s.check.candidates.some((c) => c.id === a.landmarkId)) return s
      return { ...s, selectedId: a.landmarkId }

    case 'SAVE': {
      const target = saveTarget(s)
      if ((s.phase !== 'needs_choice' && s.phase !== 'ready_to_save') || target === undefined) return s
      const { shotId, capturedAt, photo, fix, check } = s
      return { phase: 'uploading', shotId, capturedAt, photo, fix, check, landmarkId: target }
    }
    case 'SAVE_OK':
      if (s.phase !== 'uploading' || !sameShot(s, a.shotId)) return s
      return { phase: 'saved', shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, result: a.result }
    case 'SAVE_FAILED':
      if (s.phase !== 'uploading' || !sameShot(s, a.shotId)) return s
      if (a.retryLocation) {
        return {
          phase: 'retry_location',
          shotId: s.shotId,
          capturedAt: s.capturedAt,
          photo: s.photo,
          attempt: 0,
          retry: { cause: 'server', serverReason: null, message: a.message, accuracyM: s.fix.accuracyM, maxAccuracyM: s.check.limits.maxAccuracyM },
        }
      }
      return { phase: 'error', shotId: s.shotId, capturedAt: s.capturedAt, photo: s.photo, message: a.message, resume: s, attempt: 0 }

    case 'RETRY':
      // A fresh object, so the page sees a new step to run even when it is the same one again.
      return s.phase === 'error' && s.resume ? { ...s.resume } : s

    case 'DISCARD':
      return s.phase === 'idle' || s.phase === 'previewing' || s.phase === 'uploading' ? s : initialCaptureState
  }
}
