// Shrinks a picked photo in the browser before upload: at most 1600 px on the long side, re-encoded
// as JPEG (~0.82 quality). Keeps uploads small on mobile data and strips the original's metadata
// (including any GPS position the camera wrote into it).

export const MAX_EDGE_PX = 1600
export const JPEG_QUALITY = 0.82
/** The bucket's own limit (006_gallery.sql). A resized photo is far below it. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export type PreparedImage = { blob: Blob; width: number; height: number }

/** Thrown when the browser can't read the picture (an unsupported format, a damaged file…). */
export class ImageReadError extends Error {}

type Drawable = { source: CanvasImageSource; width: number; height: number; close: () => void }

async function decode(file: Blob): Promise<Drawable> {
  // createImageBitmap applies the camera's rotation (EXIF orientation) and decodes off the main thread.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // Fall through to <img>, which some browsers decode more formats with (e.g. HEIC on Safari).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new ImageReadError('This picture can’t be opened here. Try a JPEG or PNG photo.')
  }
}

/** Target size that fits within maxEdge on both sides, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE_PX) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export async function prepareImage(file: Blob): Promise<PreparedImage> {
  if (file.type && !file.type.startsWith('image/')) throw new ImageReadError('That file isn’t a picture.')
  const img = await decode(file)
  try {
    if (!img.width || !img.height) throw new ImageReadError('This picture looks empty.')
    const { width, height } = fitWithin(img.width, img.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageReadError('This browser can’t prepare photos for upload.')
    // JPEG has no transparency: put see-through PNGs on white rather than black.
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img.source, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new ImageReadError('This picture couldn’t be prepared for upload.')
    if (blob.size > MAX_UPLOAD_BYTES) throw new ImageReadError('This picture is too large to upload.')
    return { blob, width, height }
  } finally {
    img.close()
  }
}
