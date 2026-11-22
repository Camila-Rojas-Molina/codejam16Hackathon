// Cities discovered: search for a real city, watch its pin drop on the atlas, remove any you like.
// Works on a list it's given (the questionnaire draft, or the saved profile via the store).
// Duplicates are caught (same place id, or an older entry with the same name and country) and the
// existing pin is pointed out instead. Older free-text cities stay in the list with a gentle
// "Confirm on map" action until they're matched to a real place.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { cityLabel, findCity, isPinned } from '../../profile/model'
import type { DiscoveredCity } from '../../profile/types'
import { placePin, type AtlasPin } from '../pins'
import type { PlacePick } from '../types'
import CitySearch from './CitySearch'

// The atlas (with its land outlines) loads on demand, so it doesn't weigh down every screen.
const RetroAtlas = lazy(() => import('./RetroAtlas'))

export function AtlasPlaceholder() {
  return <div className="hatch aspect-[1.45] border-2 border-ink bg-teal-soft opacity-60 sm:aspect-[2.1]" aria-hidden />
}

const cityPin = (c: DiscoveredCity): AtlasPin => ({ id: c.id, label: cityLabel(c), lat: c.lat!, lng: c.lng! })

const placeOf = (c: DiscoveredCity): PlacePick | null =>
  isPinned(c) ? { placeId: c.placeId!, name: c.name, country: c.country, countryCode: c.countryCode, region: c.region, lat: c.lat!, lng: c.lng! } : null

type Note = { tone: 'done' | 'info' | 'error'; text: string; undo?: PlacePick }

type CityCollectionProps = {
  cities: DiscoveredCity[]
  onAdd: (place: PlacePick) => void | Promise<unknown>
  onRemove: (cityId: string) => void | Promise<unknown>
  /** Home city, drawn as a house marker with voyage lines to each city. */
  home?: PlacePick | null
  /** Search label. */
  label?: string
}

export default function CityCollection({ cities, onAdd, onRemove, home = null, label = 'Add a city you’ve explored' }: CityCollectionProps) {
  const [newestPlace, setNewestPlace] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const pinned = cities.filter(isPinned)
  const legacy = cities.filter((c) => !isPinned(c))
  const countries = new Set(pinned.map((c) => c.countryCode)).size
  const confirmingCity = cities.find((c) => c.id === confirming) ?? null
  const newestId = cities.find((c) => c.placeId !== null && c.placeId === newestPlace)?.id ?? null

  // The drop-in pulse only lasts a moment.
  useEffect(() => {
    if (!newestPlace) return
    const t = window.setTimeout(() => setNewestPlace(null), 2600)
    return () => window.clearTimeout(t)
  }, [newestPlace])

  function showOnMap(cityId: string) {
    setSelected(cityId)
    mapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function alreadyThere(place: PlacePick) {
    const existing = findCity(cities, place)
    setNote({ tone: 'info', text: `${place.name} is already on your map.` })
    if (existing) showOnMap(existing.id)
  }

  async function add(place: PlacePick) {
    const existing = findCity(cities, place)
    if (existing && isPinned(existing)) return alreadyThere(place)
    try {
      await onAdd(place)
      // Confirming an older entry as a differently named place: the old text entry is replaced.
      if (confirmingCity && existing?.id !== confirmingCity.id) await onRemove(confirmingCity.id)
      setNote({ tone: 'done', text: existing || confirmingCity ? `${place.name} is confirmed and pinned.` : `Pinned ${place.name}, ${place.country}.` })
      setNewestPlace(place.placeId)
      setSelected(null)
      setConfirming(null)
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof Error ? err.message : 'Couldn’t add that city. Try again.' })
    }
  }

  async function remove(c: DiscoveredCity) {
    try {
      await onRemove(c.id)
      if (selected === c.id) setSelected(null)
      if (confirming === c.id) setConfirming(null)
      setNote({ tone: 'done', text: `Removed ${cityLabel(c)}.`, undo: placeOf(c) ?? undefined })
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof Error ? err.message : 'Couldn’t remove that city. Try again.' })
    }
  }

  return (
    <div className="@container space-y-4">
      <CitySearch
        key={confirming ?? 'search'}
        label={confirmingCity ? `Find ${confirmingCity.name} on the map` : label}
        initialQuery={confirmingCity?.name ?? ''}
        autoFocus={!!confirmingCity}
        takenIds={cities.map((c) => c.placeId).filter((x): x is string => !!x)}
        onPick={add}
        onTaken={alreadyThere}
        hint={confirmingCity ? 'Pick the real place from the suggestions to pin it.' : undefined}
      />
      {confirmingCity && (
        <button type="button" onClick={() => setConfirming(null)} className="min-h-11 text-sm font-bold underline underline-offset-4">
          Cancel confirming {confirmingCity.name}
        </button>
      )}

      <div aria-live="polite">
        {note && (
          <p
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-ink px-3 py-2 text-sm font-semibold',
              note.tone === 'done' && 'bg-teal-soft',
              note.tone === 'info' && 'bg-saffron-soft',
              note.tone === 'error' && 'bg-sienna-soft',
            )}
          >
            <Icon name={note.tone === 'done' ? 'check' : note.tone === 'info' ? 'info' : 'alert'} accent={note.tone === 'error' ? 'sienna' : 'sheet'} className="size-5" />
            <span className="min-w-0 flex-1">{note.text}</span>
            {note.undo && (
              <button
                type="button"
                onClick={() => {
                  const place = note.undo!
                  setNote(null)
                  void add(place)
                }}
                className="min-h-9 border-2 border-ink bg-sheet px-2.5 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
              >
                Undo
              </button>
            )}
          </p>
        )}
      </div>

      <div ref={mapRef} className="scroll-mt-24">
        <Suspense fallback={<AtlasPlaceholder />}>
          <RetroAtlas
            pins={pinned.map(cityPin)}
            home={home ? placePin(home, 'home') : null}
            routes
            newestId={newestId}
            selectedId={selected}
            onSelect={setSelected}
            emptyMessage="Your first pin lands here."
            stats={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {pinned.length} {pinned.length === 1 ? 'city' : 'cities'} · {countries} {countries === 1 ? 'country' : 'countries'}
                </span>
                {home && (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="inline-block size-3 border-2 border-ink bg-teal" aria-hidden />
                    Home
                  </span>
                )}
              </span>
            }
          />
        </Suspense>
      </div>

      {cities.length > 0 && (
        <ul className="grid grid-cols-1 border-t-2 border-l-2 border-ink @lg:grid-cols-2" aria-label="Your cities">
          {cities.map((c) => {
            const isOnMap = isPinned(c)
            const active = selected === c.id
            return (
              <li key={c.id} className={cn('flex items-stretch border-r-2 border-b-2 border-ink', active ? 'bg-saffron-soft' : 'sheet-grain')}>
                <span className="grid w-11 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft" aria-hidden>
                  <Icon name={isOnMap ? 'pin' : 'alert'} accent={isOnMap ? 'sienna' : 'sandy'} className="size-6" />
                </span>
                {isOnMap ? (
                  <button
                    type="button"
                    onClick={() => (active ? setSelected(null) : showOnMap(c.id))}
                    aria-pressed={active}
                    aria-label={`${cityLabel(c)}: show on the map`}
                    className="min-w-0 flex-1 px-3 py-2 text-left transition-colors hover:bg-saffron-soft"
                  >
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="block truncate text-sm">
                      {[c.region, c.country].filter(Boolean).join(', ')}
                      {c.source !== 'manual' && ` · from a ${c.source}`}
                    </span>
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 px-3 py-2">
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="block truncate text-sm">Not on the map yet</span>
                  </span>
                )}
                {!isOnMap && (
                  <button
                    type="button"
                    onClick={() => setConfirming(c.id)}
                    className="flex shrink-0 items-center gap-1 border-l-2 border-ink px-2.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors hover:bg-saffron"
                    aria-label={`Confirm ${c.name} on the map`}
                  >
                    <Icon name="pin" accent="sienna" className="size-4" />
                    Confirm
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(c)}
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
          {legacy.length === 1 ? 'One city you added earlier isn’t' : `${legacy.length} cities you added earlier aren’t`} on the map yet. Tap “Confirm” to
          pick the real place and drop its pin.
        </p>
      )}
    </div>
  )
}
