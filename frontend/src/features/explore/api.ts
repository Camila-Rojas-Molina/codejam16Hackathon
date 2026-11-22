// Client for the exploration RPCs (backend/supabase/migrations/007_landmarks_geofencing.sql).
// Owned by the lead: map, camera and gallery all call these; don't duplicate them elsewhere.
import { BackendError, isBackendConfigured, rpc } from '../../lib/backend'
import type {
  Bounds,
  CandidateLandmark,
  CaptureResult,
  Discovery,
  GpsFix,
  LandmarkCategory,
  LandmarkDetail,
  LandmarkSummary,
  LocationCheck,
} from './types'

export { isBackendConfigured }

type SummaryRow = {
  id: string
  slug: string
  name: string
  category: LandmarkCategory
  lat: number
  lng: number
  geofence_radius_m: number
  has_polygon: boolean
  visited: boolean
  visited_at: string | null
  recommended: boolean
}

type DetailRow = SummaryRow & {
  description: string | null
  address: string | null
  neighbourhood: string | null
  polygon: LandmarkDetail['polygon']
  source_name: string
  source_url: string | null
  source_license: string
  source_record_id: string | null
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) || null : null)

const toSummary = (r: SummaryRow): LandmarkSummary => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  lat: r.lat,
  lng: r.lng,
  geofenceRadiusM: r.geofence_radius_m,
  hasPolygon: r.has_polygon,
  visited: r.visited,
  visitedAt: ms(r.visited_at),
  recommended: r.recommended,
})

/** Active landmarks inside the viewport (plus the user's visited/recommended flags). */
export async function landmarksInView(b: Bounds, limit = 3000): Promise<LandmarkSummary[]> {
  const rows = await rpc<SummaryRow[] | null>('landmarks_in_view', {
    p_west: b.west,
    p_south: b.south,
    p_east: b.east,
    p_north: b.north,
    p_limit: limit,
  })
  return (rows ?? []).map(toSummary)
}

export async function getLandmark(idOrSlug: string): Promise<LandmarkDetail | null> {
  const r = await rpc<DetailRow | null>('landmark_get', { p_id_or_slug: idOrSlug })
  if (!r) return null
  return {
    ...toSummary(r),
    description: r.description,
    address: r.address,
    neighbourhood: r.neighbourhood,
    polygon: r.polygon,
    source: { name: r.source_name, url: r.source_url, license: r.source_license, recordId: r.source_record_id },
  }
}

const fixArgs = (fix: GpsFix, capturedAt: number) => ({
  p_lat: fix.lat,
  p_lng: fix.lng,
  p_accuracy_m: fix.accuracyM,
  p_position_at: new Date(fix.positionAt).toISOString(),
  p_captured_at: new Date(capturedAt).toISOString(),
})

type CheckRow = {
  status: LocationCheck['status']
  reason: string | null
  message: string
  candidates: { id: string; name: string; category: LandmarkCategory; distance_m: number; match: 'radius' | 'polygon'; visited: boolean }[]
  resolved_landmark_id: string | null
  ambiguous: boolean
  limits: { max_accuracy_m: number; max_position_age_s: number; max_capture_gap_s: number }
}

/** Read-only pre-check: is this fix usable, is it on Montréal Island, which landmark(s) match. */
export async function checkLocation(fix: GpsFix, capturedAt: number): Promise<LocationCheck> {
  const r = await rpc<CheckRow>('explore_check_location', fixArgs(fix, capturedAt))
  return {
    status: r.status,
    reason: r.reason,
    message: r.message,
    candidates: (r.candidates ?? []).map(
      (c): CandidateLandmark => ({ id: c.id, name: c.name, category: c.category, distanceM: c.distance_m, match: c.match, visited: c.visited }),
    ),
    resolvedLandmarkId: r.resolved_landmark_id,
    ambiguous: r.ambiguous,
    limits: { maxAccuracyM: r.limits.max_accuracy_m, maxPositionAgeS: r.limits.max_position_age_s, maxCaptureGapS: r.limits.max_capture_gap_s },
  }
}

type CaptureRow = {
  photo_id: string
  association_status: CaptureResult['associationStatus']
  landmark: { id: string; name: string; slug: string } | null
  new_discovery: boolean
  first_visited_at: string | null
}

export type RegisterCapture = {
  /** <auth uid>/<random>.jpg in the private 'gallery' bucket, already uploaded. */
  storagePath: string
  fix: GpsFix
  capturedAt: number
  /** The user's pick when the check was ambiguous. Must be one of the server's candidates. */
  landmarkId?: string | null
  width: number
  height: number
  fileSizeBytes: number
}

/**
 * Server re-validates the fix (source of truth), then saves the photo and, when a landmark
 * matches, the first visit, in one transaction. Throws BackendError; `code`:
 *   'P0001' with hint in message for retry/outside/rate-limit, '42501' not signed in, '22023' bad input.
 * On any error the caller must delete the uploaded file.
 */
export async function registerCapture(c: RegisterCapture): Promise<CaptureResult> {
  const r = await rpc<CaptureRow>('explore_register_capture', {
    p_storage_path: c.storagePath,
    ...fixArgs(c.fix, c.capturedAt),
    p_landmark_id: c.landmarkId ?? null,
    p_width: c.width,
    p_height: c.height,
    p_file_size_bytes: c.fileSizeBytes,
  })
  return {
    photoId: r.photo_id,
    associationStatus: r.association_status,
    landmark: r.landmark,
    newDiscovery: r.new_discovery,
    firstVisitedAt: ms(r.first_visited_at),
  }
}

type DiscoveryRow = {
  landmark_id: string
  name: string
  slug: string
  category: LandmarkCategory
  first_visited_at: string
  first_photo_id: string | null
  photo_count: number
}

/** The signed-in user's visited landmarks, newest first. */
export async function myDiscoveries(): Promise<Discovery[]> {
  const rows = await rpc<DiscoveryRow[] | null>('explore_my_discoveries', {})
  return (rows ?? []).map((r) => ({
    landmarkId: r.landmark_id,
    name: r.name,
    slug: r.slug,
    category: r.category,
    firstVisitedAt: ms(r.first_visited_at) ?? 0,
    firstPhotoId: r.first_photo_id,
    photoCount: r.photo_count,
  }))
}

export { BackendError }
