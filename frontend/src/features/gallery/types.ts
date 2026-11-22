// Gallery: photos people take while exploring (backend/supabase/migrations/006_gallery.sql).
// The image lives in the 'gallery' storage bucket; a `photos` row holds what we know about it.

/** A saved photo, as the app uses it. */
export type Photo = {
  id: string
  /** Path inside the 'gallery' bucket: <auth uid>/<random id>.jpg */
  storagePath: string
  /** Public URL of the image. */
  url: string
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

export type GroupBy = 'date' | 'city'

export type PhotoGroup = {
  key: string
  title: string
  /** Small line under the title, e.g. "Portugal · 3 photos". */
  subtitle: string
  photos: Photo[]
}
