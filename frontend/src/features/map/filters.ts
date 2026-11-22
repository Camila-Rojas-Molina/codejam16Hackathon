// View filters for the map and list. They only narrow what's drawn: the catalogue query always
// returns every active landmark in view, and the default shows everything.
import type { LandmarkCategory, LandmarkSummary } from '../explore/types'

export type MapFilter = {
  /** Empty = every category. */
  categories: LandmarkCategory[]
  recommendedOnly: boolean
  notVisitedOnly: boolean
}

export const NO_FILTER: MapFilter = { categories: [], recommendedOnly: false, notVisitedOnly: false }

export const filterCount = (f: MapFilter) => f.categories.length + Number(f.recommendedOnly) + Number(f.notVisitedOnly)

export function applyFilter(list: LandmarkSummary[], f: MapFilter): LandmarkSummary[] {
  if (filterCount(f) === 0) return list
  return list.filter(
    (l) =>
      (f.categories.length === 0 || f.categories.includes(l.category)) &&
      (!f.recommendedOnly || l.recommended) &&
      (!f.notVisitedOnly || !l.visited),
  )
}
