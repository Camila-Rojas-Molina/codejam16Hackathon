// Pure helpers for the profile model: blank values, defaults, validation, normalising stored data.
import type {
  Budget,
  ExploreMode,
  LocalContext,
  ProfileRecord,
  SpendRange,
  TouristTrip,
  UniversalProfile,
} from './types'

export function emptyUniversal(): UniversalProfile {
  return {
    personality: { energy: null, newPeople: null, planning: null, decisions: null },
    interests: [],
    companion: { qualities: [], idealAdventure: null, idealAdventureNote: '', topics: [] },
    exploration: {
      budget: { level: null, range: null },
      pace: null,
      attractions: [],
      food: { styles: [], dietary: [], notes: '' },
      transport: [],
      groupSize: null,
    },
    languages: { spoken: [], preferred: [] },
    accessibility: { needs: [], notes: '', shareWithMatches: false },
  }
}

export function emptyRecord(accountId: string): ProfileRecord {
  return {
    accountId,
    universal: null,
    universalCompletedAt: null,
    activeMode: null,
    tourist: { trips: [], activeTripId: null },
    local: null,
    updatedAt: Date.now(),
  }
}

const copyBudget = (b: Budget): Budget => ({ level: b.level, range: b.range ? { ...b.range } : null })

/** A new trip, pre-filled from the universal profile. Editing the trip never touches the universal profile. */
export function newTrip(universal: UniversalProfile | null): TouristTrip {
  const now = Date.now()
  return {
    id: `trip-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    destination: '',
    dates: { kind: 'dates', start: '', end: '', approx: '' },
    companions: null,
    companionCount: 0,
    budget: universal ? copyBudget(universal.exploration.budget) : { level: null, range: null },
    interests: universal ? [...universal.interests] : [],
    activities: universal ? [...universal.exploration.attractions] : [],
    accessibility: { needs: [], notes: '' },
    createdAt: now,
    updatedAt: now,
  }
}

/** A blank local profile, with languages and transport pre-filled from the universal profile. */
export function newLocal(universal: UniversalProfile | null): LocalContext {
  return {
    homeCity: '',
    neighbourhood: '',
    languages: universal ? [...universal.languages.spoken] : [],
    knownAreas: [],
    recommendations: [],
    hiddenGems: '',
    activities: [],
    availability: [],
    duration: null,
    transport: universal ? [...universal.exploration.transport] : [],
    dogs: null,
    updatedAt: Date.now(),
  }
}

// ---- Validation -------------------------------------------------------------------------------
// Required answers are the ones matching can't work without. Everything else is skippable.

export function rangeError(range: SpendRange | null): string | null {
  if (!range) return null
  const { min, max } = range
  if ((min !== null && min < 0) || (max !== null && max < 0)) return 'Amounts can’t be negative.'
  if (min !== null && max !== null && max < min) return 'The top of the range should be at least the bottom.'
  return null
}

export function isUniversalComplete(u: UniversalProfile | null): u is UniversalProfile {
  if (!u) return false
  const p = u.personality
  const e = u.exploration
  return (
    p.energy !== null &&
    p.newPeople !== null &&
    p.planning !== null &&
    p.decisions !== null &&
    u.interests.length > 0 &&
    e.budget.level !== null &&
    rangeError(e.budget.range) === null &&
    e.pace !== null &&
    e.attractions.length > 0 &&
    e.transport.length > 0 &&
    e.groupSize !== null &&
    u.languages.spoken.length > 0
  )
}

export function tripDatesError(trip: TouristTrip): string | null {
  const d = trip.dates
  if (d.kind === 'approx') return d.approx.trim() ? null : 'Tell us roughly when you’re visiting.'
  if (!d.start) return 'Add the day you arrive (or switch to “Not sure yet”).'
  if (d.end && d.end < d.start) return 'Your last day should be after your first.'
  return null
}

export function isTripComplete(trip: TouristTrip | null | undefined): trip is TouristTrip {
  return (
    !!trip &&
    trip.destination.trim().length > 0 &&
    tripDatesError(trip) === null &&
    trip.companions !== null &&
    trip.budget.level !== null &&
    rangeError(trip.budget.range) === null
  )
}

export function isLocalComplete(local: LocalContext | null): local is LocalContext {
  return (
    !!local &&
    local.homeCity.trim().length > 0 &&
    local.languages.length > 0 &&
    local.activities.length > 0 &&
    local.availability.length > 0 &&
    local.duration !== null
  )
}

export function activeTrip(record: ProfileRecord | null): TouristTrip | null {
  if (!record) return null
  return record.tourist.trips.find((t) => t.id === record.tourist.activeTripId) ?? null
}

/** Whether the given mode has the context it needs to be switched on right away. */
export function isModeReady(record: ProfileRecord | null, mode: ExploreMode): boolean {
  if (!record) return false
  return mode === 'tourist' ? isTripComplete(activeTrip(record)) : isLocalComplete(record.local)
}

// ---- Display helpers --------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
}

/** "Jun 3 – Jun 9", "From Jun 3", or the approximate text. */
export function formatTripDates(trip: TouristTrip): string {
  const d = trip.dates
  if (d.kind === 'approx') return d.approx.trim()
  if (!d.start) return ''
  if (!d.end || d.end === d.start) return d.end ? formatDay(d.start) : `From ${formatDay(d.start)}`
  return `${formatDay(d.start)} – ${formatDay(d.end)}`
}

export type TripTiming = 'upcoming' | 'now' | 'past' | 'unknown'

export function tripTiming(trip: TouristTrip, today = new Date().toISOString().slice(0, 10)): TripTiming {
  const d = trip.dates
  if (d.kind === 'approx' || !d.start) return 'unknown'
  if (today < d.start) return 'upcoming'
  if (d.end && today > d.end) return 'past'
  return 'now'
}

// ---- Normalising stored data ------------------------------------------------------------------
// Stored JSON may come from an older build or be hand-edited. Fill gaps instead of crashing.

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const strOrNull = <T extends string>(v: unknown) => (typeof v === 'string' ? (v as T) : null)
const strArr = <T extends string>(v: unknown) => (Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as T[]) : [])
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function normBudget(v: unknown): Budget {
  if (!isObj(v)) return { level: null, range: null }
  const r = v.range
  return {
    level: strOrNull(v.level),
    range: isObj(r) ? { min: numOrNull(r.min), max: numOrNull(r.max), currency: str(r.currency, 'CAD') as SpendRange['currency'] } : null,
  }
}

export function normalizeUniversal(v: unknown): UniversalProfile | null {
  if (!isObj(v)) return null
  const base = emptyUniversal()
  const p = isObj(v.personality) ? v.personality : {}
  const c = isObj(v.companion) ? v.companion : {}
  const e = isObj(v.exploration) ? v.exploration : {}
  const f = isObj(e.food) ? e.food : {}
  const l = isObj(v.languages) ? v.languages : {}
  const a = isObj(v.accessibility) ? v.accessibility : {}
  return {
    personality: {
      energy: strOrNull(p.energy),
      newPeople: strOrNull(p.newPeople),
      planning: strOrNull(p.planning),
      decisions: strOrNull(p.decisions),
    },
    interests: strArr(v.interests),
    companion: {
      qualities: strArr(c.qualities),
      idealAdventure: strOrNull(c.idealAdventure),
      idealAdventureNote: str(c.idealAdventureNote),
      topics: strArr(c.topics),
    },
    exploration: {
      budget: normBudget(e.budget),
      pace: strOrNull(e.pace),
      attractions: strArr(e.attractions),
      food: { styles: strArr(f.styles), dietary: strArr(f.dietary), notes: str(f.notes) },
      transport: strArr(e.transport),
      groupSize: strOrNull(e.groupSize),
    },
    languages: { spoken: strArr(l.spoken), preferred: strArr(l.preferred) },
    accessibility: {
      needs: strArr(a.needs),
      notes: str(a.notes),
      shareWithMatches: a.shareWithMatches === true ? true : base.accessibility.shareWithMatches,
    },
  }
}

function normTrip(v: unknown): TouristTrip | null {
  if (!isObj(v) || typeof v.id !== 'string') return null
  const d = isObj(v.dates) ? v.dates : {}
  const acc = isObj(v.accessibility) ? v.accessibility : {}
  const count = numOrNull(v.companionCount) ?? 0
  return {
    id: v.id,
    destination: str(v.destination),
    dates: { kind: d.kind === 'approx' ? 'approx' : 'dates', start: str(d.start), end: str(d.end), approx: str(d.approx) },
    companions: strOrNull(v.companions),
    companionCount: Math.max(0, Math.round(count)),
    budget: normBudget(v.budget),
    interests: strArr(v.interests),
    activities: strArr(v.activities),
    accessibility: { needs: strArr(acc.needs), notes: str(acc.notes) },
    createdAt: numOrNull(v.createdAt) ?? Date.now(),
    updatedAt: numOrNull(v.updatedAt) ?? Date.now(),
  }
}

function normLocal(v: unknown): LocalContext | null {
  if (!isObj(v)) return null
  return {
    homeCity: str(v.homeCity),
    neighbourhood: str(v.neighbourhood),
    languages: strArr(v.languages),
    knownAreas: strArr(v.knownAreas),
    recommendations: strArr(v.recommendations),
    hiddenGems: str(v.hiddenGems),
    activities: strArr(v.activities),
    availability: strArr(v.availability),
    duration: strOrNull(v.duration),
    transport: strArr(v.transport),
    dogs: strOrNull(v.dogs),
    updatedAt: numOrNull(v.updatedAt) ?? Date.now(),
  }
}

export function normalizeRecord(v: unknown, accountId: string): ProfileRecord {
  if (!isObj(v)) return emptyRecord(accountId)
  const t = isObj(v.tourist) ? v.tourist : {}
  const trips = (Array.isArray(t.trips) ? t.trips : []).map(normTrip).filter((x): x is TouristTrip => x !== null)
  const activeTripId = typeof t.activeTripId === 'string' && trips.some((x) => x.id === t.activeTripId) ? t.activeTripId : null
  const mode = v.activeMode === 'tourist' || v.activeMode === 'local' ? v.activeMode : null
  return {
    accountId,
    universal: normalizeUniversal(v.universal),
    universalCompletedAt: numOrNull(v.universalCompletedAt),
    activeMode: mode,
    tourist: { trips, activeTripId },
    local: normLocal(v.local),
    updatedAt: numOrNull(v.updatedAt) ?? Date.now(),
  }
}
