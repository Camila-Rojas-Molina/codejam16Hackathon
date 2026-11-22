// Cities discovered: search for a real city, see it pinned on the atlas, remove any you like.
// Works on a list it's given (the questionnaire draft, or the saved profile via the store).
// Older free-text cities are kept and shown as "not pinned yet" until confirmed from search.
import { lazy, Suspense, useState } from 'react'
import Icon from '../../../components/icons/Icon'
import { cityLabel, isPinned } from '../../profile/model'
import type { DiscoveredCity } from '../../profile/types'
import type { PlacePick } from '../types'
import CitySearch from './CitySearch'
import { MAP_H, MAP_W } from '../mapFrame'

// The atlas (with its land outlines) loads on demand, so it doesn't weigh down every screen.
const RetroAtlas = lazy(() => import('./RetroAtlas'))

function AtlasPlaceholder() {
  return <div className="hatch border-2 border-ink bg-teal-soft opacity-60" style={{ aspectRatio: `${MAP_W} / ${MAP_H + 60}` }} aria-hidden />
}

type CityCollectionProps = {
  cities: DiscoveredCity[]
  onAdd: (place: PlacePick) => void | Promise<unknown>
  onRemove: (cityId: string) => void | Promise<unknown>
  /** Search label. */
  label?: string
}

export default function CityCollection({ cities, onAdd, onRemove, label = 'Add a city you’ve explored' }: CityCollectionProps) {
  const [newestId, setNewestId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [findLegacy, setFindLegacy] = useState<string | null>(null)
  const legacy = cities.filter((c) => !isPinned(c))

  async function add(place: PlacePick) {
    const before = new Set(cities.map((c) => c.placeId))
    await onAdd(place)
    setFindLegacy(null)
    setMessage(before.has(place.placeId) ? `${place.name} is already on your map.` : `Pinned ${place.name}, ${place.country}.`)
    setNewestId(place.placeId)
  }

  return (
    <div className="space-y-4">
      <CitySearch
        key={findLegacy ?? 'search'}
        label={findLegacy ? `Find ${findLegacy} on the map` : label}
        initialQuery={findLegacy ?? ''}
        autoFocus={!!findLegacy}
        takenIds={cities.map((c) => c.placeId).filter((x): x is string => !!x)}
        onPick={add}
      />
      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      <Suspense fallback={<AtlasPlaceholder />}>
        <RetroAtlas cities={cities} newestId={cities.find((c) => c.placeId === newestId)?.id ?? null} />
      </Suspense>

      {cities.length > 0 && (
        <ul className="grid border-t-2 border-l-2 border-ink sm:grid-cols-2" aria-label="Your cities">
          {cities.map((c) => {
            const pinned = isPinned(c)
            return (
              <li key={c.id} className="sheet-grain flex items-stretch border-r-2 border-b-2 border-ink">
                <span className="grid w-11 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft" aria-hidden>
                  <Icon name={pinned ? 'pin' : 'alert'} accent={pinned ? 'sienna' : 'sandy'} className="size-6" />
                </span>
                <span className="min-w-0 flex-1 px-3 py-2">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="block truncate text-sm">
                    {pinned ? [c.region, c.country].filter(Boolean).join(', ') : 'Not pinned yet'}
                    {c.source !== 'manual' && ` · from a ${c.source}`}
                  </span>
                </span>
                {!pinned && (
                  <button
                    type="button"
                    onClick={() => setFindLegacy(c.name)}
                    className="shrink-0 border-l-2 border-ink px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
                    aria-label={`Find ${c.name} on the map`}
                  >
                    Find it
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await onRemove(c.id)
                    setMessage(`Removed ${cityLabel(c)}.`)
                  }}
                  className="grid w-11 shrink-0 place-items-center border-l-2 border-ink transition-colors hover:bg-sienna-soft"
                  aria-label={`Remove ${cityLabel(c)}`}
                >
                  <Icon name="close" accent="none" strokeWidth={2.4} className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {legacy.length > 0 && (
        <p className="flex items-start gap-2 text-sm">
          <Icon name="info" accent="sheet" className="size-5" />
          Some older cities aren’t pinned yet. Tap “Find it” to pick the real place.
        </p>
      )}
    </div>
  )
}
