// Exploration: the Montréal landmark catalogue, GPS geofence checks and visits
// (backend/supabase/migrations/007_landmarks_geofencing.sql). Shared by the map, the camera and the
// gallery. The server decides every association; the client never claims a visit.

export type LandmarkCategory =
  | 'landmark'
  | 'museum'
  | 'park'
  | 'historic'
  | 'architecture'
  | 'religious'
  | 'culture'
  | 'viewpoint'
  | 'market'
  | 'public-art'
  | 'campus'
  | 'other'

/** A catalogue entry as the map shows it (landmarks_in_view). */
export type LandmarkSummary = {
  id: string
  slug: string
  name: string
  category: LandmarkCategory
  lat: number
  lng: number
  /** 1 = major landmark … 4 = minor place. Useful for ordering and clustering. */
  prominence: number
  /** Circular geofence radius (metres). Used when the landmark has no polygon. */
  geofenceRadiusM: number
  /** True when the geofence is an area (park, campus…) instead of a circle. */
  hasPolygon: boolean
  /** The signed-in person has a discovery record for it. Always false when signed out. */
  visited: boolean
  visitedAt: number | null
  /** In the person's recommendations (landmark_recommended_ids). Never hides anything. */
  recommended: boolean
}

/** GeoJSON polygon geometry (WGS84 [lng, lat] positions). */
export type GeoPolygon =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

/** Full details (landmark_get), including the polygon and attribution. */
export type LandmarkDetail = LandmarkSummary & {
  description: string | null
  address: string | null
  neighbourhood: string | null
  polygon: GeoPolygon | null
  source: { name: string; url: string | null; license: string; recordId: string | null }
}

/** Map viewport (degrees, WGS84). */
export type Bounds = { west: number; south: number; east: number; north: number }

/** One-shot GPS reading taken when the shutter is pressed. */
export type GpsFix = {
  lat: number
  lng: number
  /** Reported accuracy radius, metres. */
  accuracyM: number
  /** The reading's own timestamp (GeolocationPosition.timestamp), ms since epoch. */
  positionAt: number
}

export type CandidateLandmark = {
  id: string
  name: string
  category: LandmarkCategory
  /** Distance from the fix to the landmark's anchor point, metres. */
  distanceM: number
  match: 'radius' | 'polygon'
  visited: boolean
}

/**
 * Result of explore_check_location (read-only, before anything is uploaded).
 *   ok            inside Montréal Island. `resolvedLandmarkId` is the landmark the photo will belong to
 *                 by default, or null when no geofence matches (→ unassigned Montréal memory) or when
 *                 the match can't be decided (`ambiguous`: the person must pick one of `candidates`).
 *                 When geofences overlap, the person may switch to any other candidate.
 *   retry         the reading can't be trusted (`reason`: 'poor_accuracy' | 'stale_position' |
 *                 'capture_gap' | 'future_timestamp'): keep the photo, take a new GPS reading.
 *   outside_area  outside Montréal Island: don't upload.
 *   rate_limited  too many captures in a short time.
 */
export type LocationCheck = {
  status: 'ok' | 'retry' | 'outside_area' | 'rate_limited'
  reason: string | null
  /** Explanation from the server, safe to show. */
  message: string
  candidates: CandidateLandmark[]
  resolvedLandmarkId: string | null
  ambiguous: boolean
  /** Server thresholds, so the UI can explain them. */
  limits: { maxAccuracyM: number; maxPositionAgeS: number; maxCaptureGapS: number }
}

/** Result of explore_register_capture (after the image is uploaded). */
export type CaptureResult = {
  photoId: string
  associationStatus: 'landmark_visit' | 'montreal_unassigned'
  landmark: { id: string; name: string; slug: string } | null
  /** True when this capture created the person's first visit to the landmark. */
  newDiscovery: boolean
  firstVisitedAt: number | null
}

export type Discovery = {
  landmarkId: string
  name: string
  slug: string
  category: LandmarkCategory
  firstVisitedAt: number
  firstPhotoId: string | null
  photoCount: number
}
