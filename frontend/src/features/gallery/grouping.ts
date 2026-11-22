// Organising the gallery: group photos by the month they were taken, by city, or by MIGO place.
// Pure functions, so the page stays simple and this is easy to extend (e.g. by adventure/trip later).
import type { GroupBy, Photo, PhotoGroup, PhotoMeta } from './types'

const plural = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fullFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export const formatDay = (ms: number) => dayFormat.format(ms)
export const formatFullDate = (ms: number) => fullFormat.format(ms)
export const formatTime = (ms: number) => timeFormat.format(ms)

/** Camera captures carry a precise time worth showing; manual uploads only a day. */
export const hasCaptureTime = (photo: Photo) => photo.associationStatus !== null

/** "Visited: Mount Royal" / "Montréal memory", or null for manual uploads. */
export function associationLabel(photo: Photo): string | null {
  if (photo.associationStatus === 'landmark_visit') return photo.landmark ? `Visited: ${photo.landmark.name}` : 'Visited'
  if (photo.associationStatus === 'montreal_unassigned') return 'Montréal memory'
  return null
}

/** Where the photo is from, best first: the landmark, then the city. */
export const placeName = (photo: Photo): string | null => photo.landmark?.name ?? photo.city?.name ?? null

/** "Lisbon, Portugal", or null when the photo has no city. */
export function cityLabel(photo: Photo): string | null {
  if (!photo.city) return null
  return [photo.city.name, photo.city.country].filter(Boolean).join(', ')
}

/** Short alt text: the caption if there is one, else where and when. */
export function photoAlt(photo: Photo): string {
  if (photo.caption) return photo.caption
  const where = placeName(photo)
  return `Photo${where ? ` in ${where}` : ''}, ${formatDay(photo.takenAt)}`
}

const monthKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const cityKey = (p: Photo) =>
  p.city ? (p.city.placeId ?? `${p.city.name.toLowerCase()}|${(p.city.countryCode ?? p.city.country ?? '').toLowerCase()}`) : ''

/** Group keys for photos without a landmark when grouping by place. Shown last, in this order. */
export const MEMORY_GROUP = 'montreal-memories'
export const OTHER_GROUP = 'no-place'

const placeKey = (p: Photo) => (p.landmark ? `landmark-${p.landmark.id}` : p.associationStatus === 'montreal_unassigned' ? MEMORY_GROUP : OTHER_GROUP)

const placeTitle = (p: Photo) => (p.landmark ? p.landmark.name : p.associationStatus === 'montreal_unassigned' ? 'Montréal memories' : 'Not linked to a place')

/**
 * Photos arrive newest first and keep that order inside each group.
 * By date: one group per month, newest month first.
 * By city: one group per city, the city with the newest photo first; photos without a city last.
 * By place: one group per MIGO landmark (newest first), then Montréal memories, then everything
 * else (manual uploads, hunt selfies).
 */
export function groupPhotos(photos: Photo[], by: GroupBy): PhotoGroup[] {
  const sorted = [...photos].sort((a, b) => b.takenAt - a.takenAt || b.createdAt - a.createdAt)
  const groups = new Map<string, PhotoGroup>()
  for (const p of sorted) {
    const key = by === 'date' ? monthKey(p.takenAt) : by === 'place' ? placeKey(p) : cityKey(p)
    let g = groups.get(key)
    if (!g) {
      g = {
        key: key || 'no-city',
        title: by === 'date' ? monthFormat.format(p.takenAt) : by === 'place' ? placeTitle(p) : (p.city?.name ?? 'No city yet'),
        subtitle: '',
        photos: [],
        landmark: by === 'place' ? (p.landmark ?? undefined) : undefined,
      }
      groups.set(key, g)
    }
    g.photos.push(p)
  }
  const list = [...groups.values()]
  if (by === 'place') {
    const rank = (k: string) => (k === MEMORY_GROUP ? 1 : k === OTHER_GROUP ? 2 : 0)
    list.sort((a, b) => rank(a.key) - rank(b.key))
  } else if (by === 'city') {
    // Unplaced photos go last.
    list.sort((a, b) => Number(a.key === 'no-city') - Number(b.key === 'no-city'))
  }
  for (const g of list) {
    const first = g.photos[0]
    if (by === 'place') {
      g.subtitle = [g.landmark ? 'Visited' : null, plural(g.photos.length)].filter(Boolean).join(' · ')
    } else if (by === 'city') {
      const country = g.key === 'no-city' ? null : first.city?.country
      g.subtitle = [country, plural(g.photos.length)].filter(Boolean).join(' · ')
    } else {
      const cities = new Set(g.photos.map((p) => p.city?.name).filter(Boolean))
      g.subtitle = [plural(g.photos.length), cities.size ? `${cities.size} ${cities.size === 1 ? 'city' : 'cities'}` : null]
        .filter(Boolean)
        .join(' · ')
    }
  }
  return list
}

/** Distinct cities from the photos (newest first), for quick picks when adding another. */
export function recentCities(photos: Photo[], limit = 4) {
  const seen = new Set<string>()
  const out: NonNullable<PhotoMeta['city']>[] = []
  for (const p of photos) {
    if (!p.city) continue
    const k = cityKey(p)
    if (seen.has(k)) continue
    seen.add(k)
    const { name, country, countryCode, placeId } = p.city
    out.push({
      name,
      country: country ?? undefined,
      countryCode: countryCode ?? undefined,
      placeId: placeId ?? undefined,
      lat: p.lat ?? undefined,
      lng: p.lng ?? undefined,
    })
    if (out.length >= limit) break
  }
  return out
}
