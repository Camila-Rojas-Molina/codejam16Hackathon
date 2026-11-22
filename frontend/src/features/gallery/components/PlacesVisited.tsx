// "Places visited": how many MIGO landmarks the person has discovered, as chips that open the map
// on that place. Visits are kept by the server even when their photos are deleted.
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import type { Discovery } from '../../explore/types'
import { formatDay } from '../grouping'

export default function PlacesVisited({ discoveries }: { discoveries: Discovery[] }) {
  if (!discoveries.length) return null
  const n = discoveries.length
  return (
    <section aria-labelledby="places-visited" className="sheet-grain border-2 border-ink p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="places-visited" className="flex items-center gap-2 text-xl sm:text-2xl">
          <Icon name="flag" accent="teal" className="size-6" />
          Places visited
        </h2>
        <p className="eyebrow">
          {n} {n === 1 ? 'MIGO place' : 'MIGO places'}
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Visited places">
        {discoveries.map((d) => (
          <li key={d.landmarkId}>
            <Link
              to={`/map?landmark=${encodeURIComponent(d.landmarkId)}`}
              className="flex min-h-11 items-center gap-1.5 border-2 border-ink bg-teal-soft px-3 py-1 text-sm font-bold transition-colors hover:bg-saffron-soft"
              title={`First visited ${formatDay(d.firstVisitedAt)}`}
            >
              <Icon name="pin" accent="sienna" className="size-5" />
              <span className="max-w-[14rem] truncate">{d.name}</span>
              <span className="sr-only">, first visited {formatDay(d.firstVisitedAt)}, see on map</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
