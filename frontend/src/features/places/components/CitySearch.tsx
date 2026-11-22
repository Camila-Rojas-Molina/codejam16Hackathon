// City autocomplete (WAI-ARIA combobox). Only real places can be picked: suggestions come from the
// bundled GeoNames list (instant, offline) plus Open-Meteo when online. Free text is never saved.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import Icon from '../../../components/icons/Icon'
import { fieldLabel, inputBase } from '../../../components/ui/Fields'
import { cn } from '../../../lib/cn'
import { mergePlaces, searchBundled, searchRemote } from '../citySearch'
import type { PlacePick } from '../types'

type CitySearchProps = {
  label: string
  onPick: (place: PlacePick) => void
  /** Place ids already chosen (shown as "Added", not pickable again). */
  takenIds?: string[]
  /** Called instead of onPick when an "Added" place is chosen, e.g. to point it out on the map. */
  onTaken?: (place: PlacePick) => void
  placeholder?: string
  initialQuery?: string
  hint?: string
  autoFocus?: boolean
}

export default function CitySearch({
  label,
  onPick,
  takenIds = [],
  onTaken,
  placeholder = 'Start typing a city, e.g. Lisbon',
  initialQuery = '',
  hint,
  autoFocus,
}: CitySearchProps) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<PlacePick[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [remote, setRemote] = useState<'idle' | 'loading' | 'ok' | 'unavailable'>('idle')

  const q = query.trim()
  const searching = q.length >= 2
  // Too short to search: show nothing (derived, not stored).
  const shown = searching ? results : []

  useEffect(() => {
    if (!searching) return
    const ctrl = new AbortController()
    let local: PlacePick[] = []
    // Bundled results right away…
    searchBundled(q).then((r) => {
      if (ctrl.signal.aborted) return
      local = r
      setResults(mergePlaces(r, []))
      setActive(r.length ? 0 : -1)
    })
    // …then smaller towns from the online source, after a short pause in typing.
    const t = window.setTimeout(() => {
      searchRemote(q, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return
          setResults((prev) => mergePlaces(local.length ? local : prev, r))
          setRemote('ok')
        })
        .catch(() => !ctrl.signal.aborted && setRemote('unavailable'))
    }, 250)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [q, searching])

  function choose(p: PlacePick) {
    if (takenIds.includes(p.placeId)) {
      onTaken?.(p)
      setOpen(false)
      return
    }
    onPick(p)
    setQuery('')
    setRemote('idle')
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(shown.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      // Never submit the surrounding form from here.
      e.preventDefault()
      if (open && shown[active]) choose(shown[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && searching
  const status = !searching
    ? ''
    : shown.length === 0
        ? remote === 'loading'
          ? 'Searching…'
          : 'No matching city. Try another spelling.'
        : `${shown.length} ${shown.length === 1 ? 'city' : 'cities'} found. Use the arrow keys to choose.`

  return (
    <div className="relative">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-6 -translate-y-1/2" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setRemote(e.target.value.trim().length >= 2 ? 'loading' : 'idle')
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={cn(inputBase, 'min-h-14 pr-4 pl-11 text-lg')}
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm">
          {hint}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {showList && (
        <div className="sheet-grain absolute inset-x-0 z-30 mt-1 border-2 border-ink shadow-block-sm">
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="max-h-80 overflow-y-auto">
          {shown.map((p, i) => {
            const taken = takenIds.includes(p.placeId)
            return (
              <li
                key={p.placeId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={taken || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 border-b-2 border-ink px-3 py-2.5 last:border-b-0',
                  i === active && 'bg-saffron',
                  taken && (onTaken ? 'opacity-75' : 'cursor-default opacity-60'),
                )}
              >
                <Icon name="pin" accent="sienna" className="size-6" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{p.name}</span>
                  <span className="block text-sm">{[p.region, p.country].filter(Boolean).join(', ')}</span>
                </span>
                {taken && <span className="shrink-0 text-xs font-bold tracking-[0.1em] uppercase">Added</span>}
              </li>
            )
          })}
        </ul>
        {shown.length === 0 && (
          <p className="px-3 py-3 text-sm font-semibold" aria-hidden>
            {status}
          </p>
        )}
        <p className="border-t-2 border-ink px-3 py-1.5 text-[0.7rem]">
          {remote === 'unavailable' ? 'Showing larger cities while offline. ' : ''}City data © GeoNames (CC BY 4.0)
        </p>
        </div>
      )}
    </div>
  )
}
