// The camera screen's state machine, as a pure reducer (no I/O, so it's easy to reason about):
//
//   idle → previewing → capturing → locating → checking → choose | ready | retry_location
//                                                          | outside_area | error
//   choose / ready → uploading → saved            (or back to retry_location / outside_area / error)
//
// The image (encoded off the shutter press) and the GPS reading arrive in any order; `settle` picks
// the phase from what's there. The photo stays in memory the whole time: "Retry location" asks for a
// new reading for the SAME photo and capturedAt (the server limits the capture↔fix gap); Retake and
// Cancel discard it. Every new photo or GPS request carries a fresh `attempt`, so late answers
// meant for an older one are ignored.
import { CAPTURE_ERROR } from '../explore/api'
import type { CandidateLandmark, CaptureResult, GpsFix, LocationCheck } from '../explore/types'

export type Shot = { blob: Blob; width: number; height: number; source: 'camera' | 'file' }

export type Phase =
  | 'idle'
  | 'previewing'
  | 'capturing'
  | 'locating'
  | 'checking'
  | 'choose'
  | 'ready'
  | 'retry_location'
  | 'outside_area'
  | 'error'
  | 'uploading'
  | 'saved'

export type GpsProblem = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export type CaptureErrorKind = 'gps_denied' | 'gps_unsupported' | 'rate_limited' | 'image' | 'check_failed' | 'save_failed'

export type CaptureState = {
  phase: Phase
  attempt: number
  capturedAt: number | null
  shot: Shot | null
  fix: GpsFix | null
  /** Arrived while the image was still being encoded; applied once it's there. */
  gpsProblem: GpsProblem | null
  checkError: string | null
  check: LocationCheck | null
  /** Where the photo will be saved: a candidate's id, or null (Montréal memory / not picked yet). */
  selectedId: string | null
  /** What to tell the person in retry_location / outside_area / choose / error. */
  message: string | null
  error: CaptureErrorKind | null
  result: CaptureResult | null
}

export type CaptureEvent =
  | { type: 'preview' }
  | { type: 'preview_stopped' }
  | { type: 'shutter'; attempt: number; capturedAt: number }
  | { type: 'image'; attempt: number; shot: Shot }
  | { type: 'image_failed'; attempt: number; message: string }
  | { type: 'fix'; attempt: number; fix: GpsFix }
  | { type: 'gps_failed'; attempt: number; problem: GpsProblem }
  | { type: 'checked'; attempt: number; check: LocationCheck }
  | { type: 'check_failed'; attempt: number; message: string }
  | { type: 'select'; landmarkId: string }
  | { type: 'relocate'; attempt: number }
  | { type: 'save' }
  | { type: 'saved'; attempt: number; result: CaptureResult }
  /** `now`: when it failed, to tell whether a new reading could still be close enough to the photo. */
  | { type: 'save_failed'; attempt: number; code: string | null; reason?: string | null; message: string; now?: number }
  | { type: 'discard' }

export const initialCapture: CaptureState = {
  phase: 'idle',
  attempt: 0,
  capturedAt: null,
  shot: null,
  fix: null,
  gpsProblem: null,
  checkError: null,
  check: null,
  selectedId: null,
  message: null,
  error: null,
  result: null,
}

const PIPELINE: Phase[] = ['capturing', 'locating', 'checking']
/** Phases where a new GPS reading can be asked for, keeping the photo. */
const RELOCATABLE: Phase[] = ['retry_location', 'outside_area', 'error', 'choose', 'ready']

export const GPS_MESSAGES: Record<GpsProblem, string> = {
  denied:
    'MIGO isn’t allowed to use your location, so this photo can’t be linked to a place. Allow location for this site in your browser settings (on iPhone: Settings › Privacy & Security › Location Services › Safari Websites), then try again.',
  unavailable: 'Your position couldn’t be found. Step outside or away from tall buildings, then retry.',
  timeout: 'Finding your position took too long. Make sure location is on, then retry.',
  unsupported: 'This browser can’t share a location, so photos can’t be linked to a place here.',
}

function fromCheck(s: CaptureState, check: LocationCheck): CaptureState {
  const next = { ...s, check, message: check.message || null, error: null }
  switch (check.status) {
    case 'ok':
      return check.ambiguous
        ? { ...next, phase: 'choose', selectedId: null }
        : { ...next, phase: 'ready', selectedId: check.resolvedLandmarkId }
    case 'retry':
      return { ...next, phase: 'retry_location' }
    case 'outside_area':
      return { ...next, phase: 'outside_area' }
    case 'rate_limited':
      return { ...next, phase: 'error', error: 'rate_limited' }
  }
}

/** Pick the phase from what has arrived so far (image, GPS, server check). */
function settle(s: CaptureState): CaptureState {
  if (!s.shot) return { ...s, phase: 'capturing' }
  if (s.gpsProblem === 'denied') return { ...s, phase: 'error', error: 'gps_denied', message: GPS_MESSAGES.denied }
  if (s.gpsProblem === 'unsupported') return { ...s, phase: 'error', error: 'gps_unsupported', message: GPS_MESSAGES.unsupported }
  if (s.gpsProblem) return { ...s, phase: 'retry_location', message: GPS_MESSAGES[s.gpsProblem] }
  if (!s.fix) return { ...s, phase: 'locating' }
  if (s.checkError) return { ...s, phase: 'error', error: 'check_failed', message: s.checkError }
  if (!s.check) return { ...s, phase: 'checking' }
  return fromCheck(s, s.check)
}

const fresh = (attempt: number, capturedAt: number): CaptureState => ({ ...initialCapture, phase: 'capturing', attempt, capturedAt })

export function captureReducer(s: CaptureState, e: CaptureEvent): CaptureState {
  // Answers meant for an older photo or GPS request.
  if ('attempt' in e && e.type !== 'shutter' && e.type !== 'relocate' && e.attempt !== s.attempt) return s
  const inPipeline = PIPELINE.includes(s.phase)

  switch (e.type) {
    case 'preview':
      return s.phase === 'idle' ? { ...initialCapture, phase: 'previewing', attempt: s.attempt } : s
    case 'preview_stopped':
      return s.phase === 'previewing' ? { ...s, phase: 'idle' } : s
    case 'shutter':
      return s.phase === 'idle' || s.phase === 'previewing' ? fresh(e.attempt, e.capturedAt) : s
    case 'image':
      return inPipeline ? settle({ ...s, shot: e.shot }) : s
    case 'image_failed':
      return inPipeline ? { ...s, phase: 'error', error: 'image', message: e.message } : s
    case 'fix':
      return inPipeline ? settle({ ...s, fix: e.fix, gpsProblem: null }) : s
    case 'gps_failed':
      return inPipeline ? settle({ ...s, gpsProblem: e.problem }) : s
    case 'checked':
      return inPipeline ? settle({ ...s, check: e.check }) : s
    case 'check_failed':
      return inPipeline ? settle({ ...s, checkError: e.message }) : s
    case 'select': {
      if (s.phase !== 'choose' && s.phase !== 'ready') return s
      return s.check?.candidates.some((c) => c.id === e.landmarkId) ? { ...s, selectedId: e.landmarkId } : s
    }
    case 'relocate':
      // Same photo, same capturedAt, a brand-new reading. Not after a refusal the person must fix
      // first, nor when the photo is already too old for any new reading (capture_gap → Retake).
      if (!s.shot || !RELOCATABLE.includes(s.phase) || s.error === 'gps_unsupported' || s.error === 'image' || needsRetake(s)) return s
      return {
        ...s,
        phase: 'locating',
        attempt: e.attempt,
        fix: null,
        gpsProblem: null,
        checkError: null,
        check: null,
        selectedId: null,
        message: null,
        error: null,
      }
    case 'save':
      return canSave(s) ? { ...s, phase: 'uploading', message: null, error: null } : s
    case 'saved':
      return s.phase === 'uploading' ? { ...s, phase: 'saved', result: e.result } : s
    case 'save_failed': {
      if (s.phase !== 'uploading') return s
      const message = e.message || null
      switch (e.code) {
        case CAPTURE_ERROR.retry: {
          // The server sends the reason as the error hint. Without one: if the capture↔fix limit has
          // already passed, any new reading would fail too, so treat it as capture_gap (→ Retake).
          const tooLate = !!s.check && s.capturedAt !== null && e.now !== undefined && e.now - s.capturedAt > s.check.limits.maxCaptureGapS * 1000
          const reason = e.reason || (tooLate ? 'capture_gap' : s.check?.reason ?? null)
          return { ...s, phase: 'retry_location', message, check: s.check ? { ...s.check, reason } : s.check }
        }
        case CAPTURE_ERROR.outsideArea:
          return { ...s, phase: 'outside_area', message }
        case CAPTURE_ERROR.rateLimited:
          return { ...s, phase: 'error', error: 'rate_limited', message }
        case CAPTURE_ERROR.invalidChoice:
          return s.check?.candidates.length
            ? { ...s, phase: 'choose', selectedId: null, message: message ?? 'That place can’t be chosen for this photo. Pick another one.' }
            : { ...s, phase: 'error', error: 'save_failed', message }
        default:
          return { ...s, phase: 'error', error: 'save_failed', message }
      }
    }
    case 'discard':
      return s.phase === 'uploading' ? s : { ...initialCapture, attempt: s.attempt }
  }
}

/** Ready to upload: a decided place (or none, for a Montréal memory), or a retry after a failed save. */
export function canSave(s: CaptureState): boolean {
  if (!s.shot || !s.fix || s.capturedAt === null) return false
  if (s.phase === 'ready') return true
  if (s.phase === 'choose') return s.selectedId !== null
  return s.phase === 'error' && s.error === 'save_failed' && s.check?.status === 'ok' && (!s.check.ambiguous || s.selectedId !== null)
}

export function selectedCandidate(s: CaptureState): CandidateLandmark | null {
  return s.check?.candidates.find((c) => c.id === s.selectedId) ?? null
}

/**
 * The photo and any new reading would be too far apart in time (reason 'capture_gap'): only a new
 * photo helps. Other retry reasons (poor_accuracy, stale_position, future_timestamp,
 * implausible_travel…) keep the photo and ask for a new reading.
 */
export const needsRetake = (s: CaptureState) => s.phase === 'retry_location' && s.check?.reason === 'capture_gap'

/** Has a photo in memory (shown instead of the live camera). */
export const hasPhoto = (s: CaptureState) => s.phase !== 'idle' && s.phase !== 'previewing'

/** One line for the aria-live region. */
export function statusText(s: CaptureState): string {
  switch (s.phase) {
    case 'idle':
      return ''
    case 'previewing':
      return 'Camera on. Press the shutter to take a photo.'
    case 'capturing':
      return 'Photo taken. Preparing it…'
    case 'locating':
      return 'Finding your position…'
    case 'checking':
      return 'Checking for MIGO places nearby…'
    case 'choose':
      return 'Several MIGO places are nearby. Pick the one this photo belongs to.'
    case 'ready': {
      const c = selectedCandidate(s)
      return c ? `This photo will be saved at ${c.name}.` : 'No MIGO place here. It will be saved as a Montréal memory.'
    }
    case 'retry_location':
      return s.message ?? 'Your position isn’t precise enough yet. Retry location.'
    case 'outside_area':
      return 'This spot is outside Montréal Island. Nothing was uploaded.'
    case 'error':
      return s.message ?? 'Something went wrong.'
    case 'uploading':
      return 'Saving your photo…'
    case 'saved':
      return s.result?.newDiscovery ? `New discovery! ${s.result.landmark?.name ?? ''} saved.` : 'Photo saved.'
  }
}
