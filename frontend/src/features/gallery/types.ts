// Gallery: photos people take while exploring (backend/supabase/migrations/006_gallery.sql, 007).
// The image lives in the private 'gallery' storage bucket; a `photos` row holds what we know about
// it, including the landmark the server matched for camera captures.

/** A saved photo, as the app uses it. */
export type Photo = {
  id: string
  /** Path inside the 'gallery' bucket: <auth uid>/<random id>.jpg */
  storagePath: string
  /** Signed URL of the image, or null when it couldn't be signed. Valid until urlExpiresAt. */
  url: string | null
  /** ms since epoch. 0 when there's no usable URL. */
  urlExpiresAt: number
  city: { name: string; country: string | null; countryCode: string | null; placeId: string | null } | null
  lat: number | null
  lng: number | null
  caption: string | null
  questId: string | null
  huntId: string | null
  /** When the photo was taken, ms since epoch. */
  takenAt: number
  width: number | null
  height: number | null
  createdAt: number
  /** The MIGO place the server linked a camera capture to. */
  landmark: { id: string; name: string; slug: string | null } | null
  /**
   * landmark_visit        camera capture inside a landmark's geofence
   * montreal_unassigned   camera capture on Montréal Island, no landmark nearby
   * null                  manual upload: no location check
   */
  associationStatus: 'landmark_visit' | 'montreal_unassigned' | null
  gpsAccuracyM: number | null
  fileSizeBytes: number | null
}

/** What the app sends with a new photo. Everything is optional. */
export type PhotoMeta = {
  city?: { name: string; country?: string; countryCode?: string; placeId?: string; lat?: number; lng?: number } | null
  caption?: string
  questId?: string
  huntId?: string
  /** ms since epoch. Defaults to now on the server; never later than now. */
  takenAt?: number
}

export const CAPTION_MAX = 200

export type GroupBy = 'date' | 'city' | 'place'

export type PhotoGroup = {
  key: string
  title: string
  /** Small line under the title, e.g. "Portugal · 3 photos". */
  subtitle: string
  photos: Photo[]
  /** By place: the landmark this group is about. */
  landmarkId?: string | null
}
