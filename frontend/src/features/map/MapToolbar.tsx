// The ruled strip above the map: how many places are in view, the List toggle (an accessible list
// of the same places) and the optional view filters. Filters start off: everything is shown.
import { useId, useState } from 'react'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkCategory } from '../explore/types'
import { NO_FILTERS, activeFilterCount, categoryLabel, type MapFilters } from './landmarkMeta'

const toggle = 'inline-flex min-h-11 items-center gap-1.5 border-2 border-ink px-3 text-xs font-bold tracking-[0.08em] uppercase transition-colors'
const toggleTone = (on: boolean) => (on ? 'bg-ink text-sheet' : 'sheet-grain text-ink hover:bg-saffron-soft')

type Props = {
  summary: string
  busy: boolean
  filters: MapFilters
  onFilters: (f: MapFilters) => void
  categories: LandmarkCategory[]
  /** Omit to hide the List toggle (when the list is the whole page). */
  listOpen?: boolean
  onToggleList?: () => void
  className?: string
}

export default function MapToolbar({ summary, busy, filters, onFilters, categories, listOpen, onToggleList, className }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const selectId = useId()
  const active = activeFilterCount(filters)

  return (
    <div className={cn('sheet-grain border-b-2 border-ink', className)}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <p className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold" role="status" aria-live="polite" aria-busy={busy}>
          {busy && <span className="mr-1.5 inline-block size-2.5 animate-pulse rounded-full bg-saffron align-middle ring-2 ring-ink" aria-hidden />}
          {summary}
        </p>
        <button type="button" className={cn(toggle, toggleTone(open || active > 0))} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
          <Icon name="tag" accent={open || active > 0 ? 'saffron' : 'none'} className="size-4" />
          Filters{active > 0 && <span className="font-display text-sm leading-none">{` ${active}`}</span>}
        </button>
        {onToggleList && (
          <button type="button" className={cn(toggle, toggleTone(Boolean(listOpen)))} aria-pressed={Boolean(listOpen)} onClick={onToggleList}>
            <Icon name="clipboard" accent={listOpen ? 'saffron' : 'none'} className="size-4" />
            List
          </button>
        )}
      </div>

      <div id={panelId} hidden={!open} className="border-t-2 border-ink px-2 py-2">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Show only</legend>
          <button type="button" className={cn(toggle, toggleTone(filters.notVisited))} aria-pressed={filters.notVisited}
            onClick={() => onFilters({ ...filters, notVisited: !filters.notVisited })}
          >
            {filters.notVisited && <Icon name="check" accent="none" className="size-4" />}
            Not visited
          </button>
          <button type="button" className={cn(toggle, toggleTone(filters.recommended))} aria-pressed={filters.recommended}
            onClick={() => onFilters({ ...filters, recommended: !filters.recommended })}
          >
            <Icon name="star" accent="saffron" className="size-4" />
            Recommended
          </button>
          <label htmlFor={selectId} className="sr-only">
            Category
          </label>
          <select
            id={selectId}
            value={filters.category}
            onChange={(e) => onFilters({ ...filters, category: e.target.value as MapFilters['category'] })}
            className={cn('min-h-11 max-w-full min-w-0 border-2 border-ink px-2 text-sm font-semibold', filters.category === 'all' ? 'sheet-grain' : 'bg-saffron-soft')}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          {active > 0 && (
            <button type="button" className="min-h-11 px-2 text-sm font-semibold underline decoration-2 underline-offset-2" onClick={() => onFilters(NO_FILTERS)}>
              Show everything
            </button>
          )}
        </fieldset>
      </div>
    </div>
  )
}
