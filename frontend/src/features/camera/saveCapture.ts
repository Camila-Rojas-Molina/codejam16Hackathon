// Phase two of a camera capture, after explore_check_location said 'ok': upload the JPEG to the
// login's private gallery folder, then register it (the server re-checks the reading and writes the
// photo + first visit in one transaction). If registering fails for any reason, the uploaded file is
// deleted again, so storage never keeps a photo the database doesn't know about.
import { deleteGalleryFile, uploadGalleryImage } from '../../lib/backend'
import { registerCapture } from '../explore/api'
import type { CaptureResult, GpsFix } from '../explore/types'
import type { Shot } from './captureMachine'

export async function saveCapture(shot: Shot, fix: GpsFix, capturedAt: number, landmarkId: string | null): Promise<CaptureResult> {
  const storagePath = await uploadGalleryImage(shot.blob)
  try {
    return await registerCapture({
      storagePath,
      fix,
      capturedAt,
      landmarkId,
      width: shot.width,
      height: shot.height,
      fileSizeBytes: shot.blob.size,
    })
  } catch (e) {
    await deleteGalleryFile(storagePath).catch(() => undefined)
    throw e
  }
}
