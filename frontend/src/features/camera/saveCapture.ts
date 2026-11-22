// Phase two of a capture, after checkLocation said 'ok': upload the JPEG to the login's folder in
// the private 'gallery' bucket, then let the server re-check the fix and save the photo (and the
// visit) in one transaction. If registering fails, the uploaded file is deleted: no orphans.
import { BackendError, deleteGalleryFile, uploadGalleryImage } from '../../lib/backend'
import { registerCapture } from '../explore/api'
import type { CaptureResult } from '../explore/types'
import type { UploadingState } from './captureMachine'

export async function saveCapture(s: UploadingState): Promise<CaptureResult> {
  const path = await uploadGalleryImage(s.photo.blob)
  try {
    return await registerCapture({
      storagePath: path,
      fix: s.fix,
      capturedAt: s.capturedAt,
      landmarkId: s.landmarkId,
      width: s.photo.width,
      height: s.photo.height,
      fileSizeBytes: s.photo.blob.size,
    })
  } catch (e) {
    await deleteGalleryFile(path).catch(() => undefined)
    throw e
  }
}

/** How a failed save should be handled: a new GPS reading (the server refused the fix) or a retry. */
export function describeSaveError(e: unknown): { message: string; retryLocation: boolean } {
  if (e instanceof BackendError) {
    // P0001: the server re-checked the fix and refused it. The hint says why: only 'retry' (stale or
    // too vague) and 'needs_choice' are fixed by a new reading; outside the island or rate-limited aren't.
    if (e.code === 'P0001') return { message: e.message, retryLocation: e.hint !== 'outside_area' && e.hint !== 'rate_limited' }
    if (e.code === '42501' || e.status === 401) return { message: 'Your sign-in has expired. Sign in again to save photos.', retryLocation: false }
    return { message: e.message || 'The photo couldn’t be saved.', retryLocation: false }
  }
  if (e instanceof TypeError) return { message: 'No connection. Check your network and try again.', retryLocation: false }
  return { message: e instanceof Error ? e.message : 'The photo couldn’t be saved.', retryLocation: false }
}
