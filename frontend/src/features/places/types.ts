// A real place picked from city search: what we store about it.
export type PlacePick = {
  /** Provider-qualified id, e.g. "geonames:2267057". Stable across providers that use GeoNames. */
  placeId: string
  name: string
  /** ISO 3166-1 alpha-2, e.g. "PT". */
  countryCode: string
  /** English country name, e.g. "Portugal". */
  country: string
  /** First-level region when it tells places apart (e.g. a US state code). */
  region?: string
  lat: number
  lng: number
}
