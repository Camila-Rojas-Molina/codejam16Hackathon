// "Places visited": the MIGO places the person has discovered with the camera (explore_my_discoveries),
// as a count and chips that open the place on the map. Visits stay even when their photos are deleted.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { myDiscoveries } from '../../explore/api'
import type { Discovery } from '../../explore/types'

const CHIP_LIMIT = 12

export default function PlacesVisited() {
  const [list, setList] = useState<Discovery[] | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    myDiscoveries()
      .then((d) => !cancelled && setList(d))
      // Not essential to the gallery: say nothing when it can't load.
      .catch(() => !cancelled && setList([]))
    return () => {
      cancelled = true
    }
  }, [])

  if (!list || list.length === 0) return null
  const shown = showAll ? list : list.slice(0, CHIP_LIMIT)

  return (
    <section aria-labelledby="places-visited" className="border-2 border-ink bg-teal-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="places-visited" className="flex items-center gap-2 text-xl sm:text-2xl">
          <Icon name="flag" accent="saffron" className="size-6" />
          Places visited
        </h2>
        <p className="eyebrow">
          {list.length} {list.length === 1 ? 'MIGO place' : 'MIGO places'}
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {shown.map((d) => (
          <li key={d.landmarkId}>
            <Link
              to={`/map?landmark=${encodeURIComponent(d.landmarkId)}`}
              className="sheet-grain inline-flex min-h-11 max-w-full items-center gap-1.5 border-2 border-ink px-3 text-sm font-bold transition-colors hover:bg-saffron-soft"
              aria-label={`${d.name}, see on map`}
            >
              <Icon name="pin" accent="sienna" className="size-4" />
              <span className="truncate">{d.name}</span>
            </Link>
          </li>
        ))}
        {list.length > CHIP_LIMIT && (
          <li>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="inline-flex min-h-11 items-center px-3 text-sm font-bold underline decoration-2 underline-offset-4"
            >
              {showAll ? 'Show fewer' : `+${list.length - CHIP_LIMIT} more`}
            </button>
          </li>
        )}
      </ul>
    </section>
  )
}
