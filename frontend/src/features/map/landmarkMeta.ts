// How landmarks are labelled on the map: category names and glyphs, the four pin states, the
// optional view filters and the list order. Filters only narrow what is drawn; everything is
// shown by default and nothing is ever limited to recommendations.
import type { IconName } from '../../components/icons/Icon'
import type { LandmarkCategory, LandmarkSummary } from '../explore/types'

export const CATEGORIES: Record<LandmarkCategory, { label: string; icon: IconName }> = {
  landmark: { label: 'Landmark', icon: 'flag' },
  museum: { label: 'Museum', icon: 'columns' },
  park: { label: 'Park', icon: 'tree' },
  historic: { label: 'Historic site', icon: 'castle' },
  architecture: { label: 'Architecture', icon: 'buildings' },
  religious: { label: 'Place of worship', icon: 'tower' },
  culture: { label: 'Culture', icon: 'mask' },
  viewpoint: { label: 'Viewpoint', icon: 'mountain' },
  market: { label: 'Market', icon: 'basket' },
  'public-art': { label: 'Public art', icon: 'palette' },
  campus: { label: 'Campus', icon: 'book' },
  other: { label: 'Place', icon: 'pin' },
}

export const categoryLabel = (c: LandmarkCategory) => CATEGORIES[c]?.label ?? 'Place'
export const categoryIcon = (c: LandmarkCategory): IconName => CATEGORIES[c]?.icon ?? 'pin'

export type PinState = 'new' | 'visited' | 'recommended' | 'both'

export const pinState = (l: Pick<LandmarkSummary, 'visited' | 'recommended'>): PinState =>
  l.visited && l.recommended ? 'both' : l.visited ? 'visited' : l.recommended ? 'recommended' : 'new'

export const PIN_STATE_LABEL: Record<PinState, string> = {
  new: 'Not visited',
  visited: 'Visited',
  recommended: 'Recommended',
  both: 'Recommended, visited',
}

export type MapFilters = { category: LandmarkCategory | 'all'; notVisited: boolean; recommended: boolean }

export const NO_FILTERS: MapFilters = { category: 'all', notVisited: false, recommended: false }

export const activeFilterCount = (f: MapFilters) => (f.category !== 'all' ? 1 : 0) + (f.notVisited ? 1 : 0) + (f.recommended ? 1 : 0)

export const matchesFilters = (l: LandmarkSummary, f: MapFilters) =>
  (f.category === 'all' || l.category === f.category) && (!f.notVisited || !l.visited) && (!f.recommended || l.recommended)

/** Major landmarks first, then by name. */
export const byProminence = (a: LandmarkSummary, b: LandmarkSummary) => a.prominence - b.prominence || a.name.localeCompare(b.name)

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
export const formatVisited = (ms: number) => dateFormat.format(ms)

/** Screen-reader description of a pin: "Mount Royal Park, park. Recommended, visited." */
export const pinDescription = (l: LandmarkSummary) => `${l.name}, ${categoryLabel(l.category).toLowerCase()}. ${PIN_STATE_LABEL[pinState(l)]}.`
