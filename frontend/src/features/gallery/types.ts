// Gallery: photos people take while exploring (backend/supabase/migrations/006_gallery.sql, 007).
// The image lives in the private 'gallery' storage bucket; a `photos` row holds what we know about it.
// Camera captures (/camera) are linked by the server to a MIGO landmark or kept as Montréal memories.

/** A saved photo, as the app uses it. */
export type Photo = {
  id: string
  /** Path inside the 'gallery' bucket: <auth uid>/<random id>.jpg */
  storagePath: string
  /** Signed URL of the image (the bucket is private). Empty when it couldn't be signed. */
  url: string
  /** When `url` stops working, ms since epoch (0 = not signed). */
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
  /** The MIGO landmark the server linked a camera capture to. */
  landmark: { id: string; name: string; slug: string | null } | null
  /**
   * 'landmark_visit': taken inside a landmark's geofence (counts as a visit).
   * 'montreal_unassigned': taken on Montréal Island, no landmark nearby.
   * null: a manual upload or a hunt selfie (no location check).
   */
  associationStatus: AssociationStatus | null
  gpsAccuracyM: number | null
  fileSizeBytes: number | null
}

export type AssociationStatus = 'landmark_visit' | 'montreal_unassigned'

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
  /** By place: the landmark the group is for (absent for memories and unlinked photos). */
  landmark?: { id: string; name: string; slug: string | null }
}
