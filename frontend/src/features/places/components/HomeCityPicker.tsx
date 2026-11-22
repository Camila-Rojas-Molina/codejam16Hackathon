// Home city, picked on the map: search for a real city (no free text) and see it on the atlas as a
// house marker, distinct from the explored-city pins. Used by the questionnaire, the profile page
// and Local mode setup. Never filled in from GPS.
// Older profiles may only have typed text: it's shown with a gentle "Pick it on the map" prompt.
import { lazy, Suspense, useState, type ReactNode } from 'react'
import Icon from '../../../components/icons/Icon'
import { placeLabel, placePin } from '../pins'
import type { PlacePick } from '../types'
import { AtlasPlaceholder } from './CityCollection'
import CitySearch from './CitySearch'

const RetroAtlas = lazy(() => import('./RetroAtlas'))

type HomeCityPickerProps = {
  /** The picked place, or null. */
  place: PlacePick | null
  /** Typed text from before map picking (shown when there's no place). */
  legacyText?: string
  onPick: (place: PlacePick) => void | Promise<unknown>
  /** Search label, e.g. "Your home city". */
  label?: string
  /** What the marker stands for in the caption and messages, e.g. "Home" or "Hosting city". */
  markerLabel?: string
  /** Shown under the search. */
  hint?: ReactNode
  /** A quick alternative to searching, e.g. "Use my home city (Montréal)". */
  suggestion?: { label: string; place: PlacePick }
}

export default function HomeCityPicker({
  place,
  legacyText = '',
  onPick,
  label = 'Your home city',
  markerLabel = 'Home',
  hint,
  suggestion,
}: HomeCityPickerProps) {
  const [changing, setChanging] = useState(false)
  const [prefill, setPrefill] = useState<string | null>(null)
  const [error, setError] = useState('')
  const legacy = !place && legacyText.trim() ? legacyText.trim() : ''
  const searching = !place || changing

  async function pick(p: PlacePick) {
    setError('')
    try {
      await onPick(p)
      setChanging(false)
      setPrefill(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save that city. Try again.')
    }
  }

  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @2xl:items-start">
        <div className="space-y-3">
          {place && (
            <div className="sheet-grain flex items-stretch border-2 border-ink shadow-block-sm">
              <span className="grid w-14 shrink-0 place-items-center border-r-2 border-ink bg-teal" aria-hidden>
                <Icon name="house" accent="sheet" strokeWidth={2} className="size-7" />
              </span>
              <span className="min-w-0 flex-1 px-3 py-2">
                <span className="eyebrow block">{markerLabel}</span>
                <span className="block truncate text-lg font-bold">{place.name}</span>
                <span className="block truncate text-sm">{[place.region, place.country].filter(Boolean).join(', ')}</span>
              </span>
              {!changing && (
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="flex shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-ink px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
                  aria-label={`Change ${markerLabel.toLowerCase()} (${placeLabel(place)})`}
                >
                  <Icon name="pencil" className="size-4" />
                  Change
                </button>
              )}
            </div>
          )}

          {legacy && prefill === null && (
            <div className="flex flex-wrap items-center gap-3 border-2 border-dashed border-ink bg-saffron-soft px-3 py-2.5">
              <Icon name="pin" accent="sienna" className="size-6" />
              <p className="min-w-0 flex-1 text-sm font-semibold">
                You told us “{legacy}”. Pick it on the map so visitors can find you.
              </p>
              <button
                type="button"
                onClick={() => setPrefill(legacy)}
                className="min-h-11 border-2 border-ink bg-sheet px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
              >
                Pick on map
              </button>
            </div>
          )}

          {searching && (
            <CitySearch
              key={prefill ?? 'home'}
              label={place ? `New ${markerLabel.toLowerCase()}` : label}
              placeholder="Start typing your city"
              initialQuery={prefill ?? ''}
              autoFocus={changing || prefill !== null}
              onPick={pick}
            />
          )}
          {hint && <div className="text-sm">{hint}</div>}
          {searching && suggestion && suggestion.place.placeId !== place?.placeId && (
            <button
              type="button"
              onClick={() => pick(suggestion.place)}
              className="flex min-h-11 items-center gap-2 text-sm font-bold underline underline-offset-4"
            >
              <Icon name="house" className="size-5" />
              {suggestion.label}
            </button>
          )}
          {changing && (
            <button type="button" onClick={() => setChanging(false)} className="min-h-11 text-sm font-bold underline underline-offset-4">
              Keep {place?.name}
            </button>
          )}
          {error && (
            <p className="border-2 border-ink bg-sienna-soft px-3 py-2 text-sm font-semibold" role="alert">
              {error}
            </p>
          )}
        </div>

        <Suspense fallback={<AtlasPlaceholder />}>
          <RetroAtlas
            pins={[]}
            home={place ? placePin(place, 'home') : null}
            fitMinW={280}
            aspect={{ narrow: 1.6, wide: 1.9 }}
            title={markerLabel}
            stats={place ? placeLabel(place) : undefined}
            emptyMessage={legacy ? `Pick “${legacy}” and it lands here.` : 'Pick your city and your home marker lands here.'}
          />
        </Suspense>
      </div>
      <p className="sr-only" aria-live="polite">
        {place ? `${markerLabel}: ${placeLabel(place)}.` : ''}
      </p>
    </div>
  )
}
