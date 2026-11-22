// City search for "Where have you explored?". Two sources, merged and de-duplicated by GeoNames id:
//   1. Bundled list (src/data/cities.json): every city of 60k+ people plus all capitals. Loaded
//      lazily on first search, instant, works offline.
//   2. Open-Meteo geocoding (free, no key, CORS-enabled): fills in smaller towns when online.
// Both identify places by GeoNames id, so the same city never appears twice.
// To swap in another provider (e.g. Google Places), replace searchRemote(); keep PlacePick.
import type { PlacePick } from './types'

type Row = [id: number, name: string, countryCode: string, region: string, lat: number, lng: number]

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    return null
  }
})()

export function countryName(code: string) {
  try {
    return regionNames?.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** Lower-case, accents removed: "Montréal" and "montreal" match. */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

let index: Promise<{ rows: Row[]; folded: string[] }> | null = null

function loadIndex() {
  index ??= import('../../data/cities.json').then((m) => {
    const rows = m.default as Row[]
    return { rows, folded: rows.map((r) => fold(r[1])) }
  })
  return index
}

const toPick = (r: Row): PlacePick => ({
  placeId: `geonames:${r[0]}`,
  name: r[1],
  countryCode: r[2],
  country: countryName(r[2]),
  region: r[3] || undefined,
  lat: r[4],
  lng: r[5],
})

/** Bundled cities: exact name first, then starts-with, then a word starting with it; bigger cities first. */
export async function searchBundled(query: string, limit = 8): Promise<PlacePick[]> {
  const q = fold(query)
  if (q.length < 2) return []
  const { rows, folded } = await loadIndex()
  const hits: { i: number; rank: number }[] = []
  for (let i = 0; i < rows.length && hits.length < 400; i++) {
    const name = folded[i]
    const rank = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(` ${q}`) || name.includes(`-${q}`) ? 2 : -1
    if (rank >= 0) hits.push({ i, rank })
  }
  hits.sort((a, b) => a.rank - b.rank || a.i - b.i)
  return hits.slice(0, limit).map((h) => toPick(rows[h.i]))
}

type OpenMeteoResult = {
  id: number
  name: string
  latitude: number
  longitude: number
  feature_code?: string
  country_code?: string
  country?: string
  admin1?: string
  population?: number
}

const remoteCache = new Map<string, PlacePick[]>()

/** Open-Meteo geocoding (GeoNames-backed). Populated places only. Throws when offline. */
export async function searchRemote(query: string, signal?: AbortSignal): Promise<PlacePick[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const key = fold(q)
  const cached = remoteCache.get(key)
  if (cached) return cached
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`City search failed (${res.status})`)
  const body = (await res.json()) as { results?: OpenMeteoResult[] }
  const picks = (body.results ?? [])
    .filter((r) => r.feature_code?.startsWith('PPL') && r.country_code)
    .map<PlacePick>((r) => ({
      placeId: `geonames:${r.id}`,
      name: r.name,
      countryCode: r.country_code!.toUpperCase(),
      country: r.country || countryName(r.country_code!),
      region: r.admin1,
      lat: Math.round(r.latitude * 100) / 100,
      lng: Math.round(r.longitude * 100) / 100,
    }))
  remoteCache.set(key, picks)
  return picks
}

/**
 * Bundled results first, then any extra towns from the online source, without duplicates.
 * A region is only kept when two results would otherwise read the same.
 */
export function mergePlaces(local: PlacePick[], remote: PlacePick[], limit = 10): PlacePick[] {
  const seen = new Set(local.map((p) => p.placeId))
  const merged = [...local, ...remote.filter((p) => !seen.has(p.placeId))].slice(0, limit)
  const label = (p: PlacePick) => `${fold(p.name)}|${p.countryCode}`
  const counts = new Map<string, number>()
  for (const p of merged) counts.set(label(p), (counts.get(label(p)) ?? 0) + 1)
  return merged.map((p) => ((counts.get(label(p)) ?? 0) > 1 ? p : { ...p, region: undefined }))
}
