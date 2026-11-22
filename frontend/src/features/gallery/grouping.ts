// Organising the gallery: group photos by the month they were taken, by city, or by MIGO place
// (landmark). Pure functions, so the page stays simple and this is easy to extend (e.g. by trip).
import type { GroupBy, Photo, PhotoGroup, PhotoMeta } from './types'

const plural = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fullFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export const formatDay = (ms: number) => dayFormat.format(ms)
export const formatFullDate = (ms: number) => fullFormat.format(ms)
export const formatTime = (ms: number) => timeFormat.format(ms)

/** Camera captures: "Visited place" / "Montréal memory". Manual uploads have no badge. */
export function associationLabel(photo: Photo): string | null {
  if (photo.associationStatus === 'landmark_visit') return 'Visited place'
  if (photo.associationStatus === 'montreal_unassigned') return 'Montréal memory'
  return null
}

/** "Lisbon, Portugal", or null when the photo has no city. */
export function cityLabel(photo: Photo): string | null {
  if (!photo.city) return null
  return [photo.city.name, photo.city.country].filter(Boolean).join(', ')
}

/** Short alt text: the caption if there is one, else where and when. */
export function photoAlt(photo: Photo): string {
  if (photo.caption) return photo.caption
  const where = photo.landmark?.name ?? photo.city?.name
  return `Photo${where ? ` in ${where}` : ''}, ${formatDay(photo.takenAt)}`
}

const monthKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const cityKey = (p: Photo) =>
  p.city ? (p.city.placeId ?? `${p.city.name.toLowerCase()}|${(p.city.countryCode ?? p.city.country ?? '').toLowerCase()}`) : ''

export const MEMORIES_KEY = 'montreal-memories'
export const UPLOADS_KEY = 'other-uploads'

// By place: one group per landmark, then Montréal memories, then everything uploaded by hand.
function groupByPlace(sorted: Photo[]): PhotoGroup[] {
  const groups = new Map<string, PhotoGroup>()
  for (const p of sorted) {
    const key = p.landmark ? `landmark-${p.landmark.id}` : p.associationStatus === 'montreal_unassigned' ? MEMORIES_KEY : UPLOADS_KEY
    let g = groups.get(key)
    if (!g) {
      const title = p.landmark ? p.landmark.name : key === MEMORIES_KEY ? 'Montréal memories' : 'Other uploads'
      g = { key, title, subtitle: '', photos: [], landmarkId: p.landmark?.id ?? null }
      groups.set(key, g)
    }
    g.photos.push(p)
  }
  const rank = (g: PhotoGroup) => (g.key === UPLOADS_KEY ? 2 : g.key === MEMORIES_KEY ? 1 : 0)
  const list = [...groups.values()].sort((a, b) => rank(a) - rank(b))
  for (const g of list) {
    const note = g.landmarkId ? 'Visited place' : g.key === MEMORIES_KEY ? 'No MIGO place nearby' : 'Added by hand'
    g.subtitle = `${note} · ${plural(g.photos.length)}`
  }
  return list
}

/**
 * Photos arrive newest first and keep that order inside each group.
 * By date: one group per month, newest month first.
 * By city: one group per city, the city with the newest photo first; photos without a city last.
 * By place: one group per landmark (newest visit first), Montréal memories, then other uploads.
 */
export function groupPhotos(photos: Photo[], by: GroupBy): PhotoGroup[] {
  const sorted = [...photos].sort((a, b) => b.takenAt - a.takenAt || b.createdAt - a.createdAt)
  if (by === 'place') return groupByPlace(sorted)
  const groups = new Map<string, PhotoGroup>()
  for (const p of sorted) {
    const key = by === 'date' ? monthKey(p.takenAt) : cityKey(p)
    let g = groups.get(key)
    if (!g) {
      g = {
        key: key || 'no-city',
        title: by === 'date' ? monthFormat.format(p.takenAt) : (p.city?.name ?? 'No city yet'),
        subtitle: '',
        photos: [],
      }
      groups.set(key, g)
    }
    g.photos.push(p)
  }
  const list = [...groups.values()]
  if (by === 'city') {
    // Unplaced photos go last.
    list.sort((a, b) => Number(a.key === 'no-city') - Number(b.key === 'no-city'))
  }
  for (const g of list) {
    const first = g.photos[0]
    if (by === 'city') {
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
