// The filter panel: recommended / not-visited toggles and category chips (see filters.ts).
import type { ReactNode } from 'react'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkCategory } from '../explore/types'
import { NO_FILTER, filterCount, type MapFilter } from './filters'
import { CATEGORIES } from './geo'

const chip =
  'inline-flex min-h-11 items-center gap-1.5 border-2 border-ink px-3 text-xs font-bold tracking-[0.08em] uppercase transition-colors ' +
  'has-checked:bg-saffron hover:bg-saffron-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink cursor-pointer select-none'

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className={chip}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {checked && <Icon name="check" accent="none" strokeWidth={2.6} className="size-4" />}
      {children}
    </label>
  )
}

type Props = {
  value: MapFilter
  onChange: (f: MapFilter) => void
  /** Categories present in view, so the list stays short. Selected ones always show. */
  available: LandmarkCategory[]
  onClose: () => void
  className?: string
}

export default function MapFilters({ value, onChange, available, onClose, className }: Props) {
  const cats = (Object.keys(CATEGORIES) as LandmarkCategory[]).filter((c) => available.includes(c) || value.categories.includes(c))
  const toggleCat = (c: LandmarkCategory, on: boolean) =>
    onChange({ ...value, categories: on ? [...value.categories, c] : value.categories.filter((x) => x !== c) })

  return (
    <section
      aria-label="Map filters"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className={cn('sheet-grain flex max-h-full flex-col border-2 border-ink shadow-block-sm', className)}
    >
      <div className="flex items-center gap-2 border-b-2 border-ink py-1 pr-1 pl-3">
        <p className="eyebrow flex-1">Show on the map</p>
        {filterCount(value) > 0 && (
          <button type="button" onClick={() => onChange(NO_FILTER)} className="min-h-11 px-2 text-xs font-bold underline decoration-2 underline-offset-2">
            Show all
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close filters" className="grid size-11 place-items-center hover:bg-saffron-soft">
          <Icon name="close" accent="none" strokeWidth={2.2} className="size-5" />
        </button>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="eyebrow mb-2">Your landmarks</legend>
          <Toggle checked={value.recommendedOnly} onChange={(on) => onChange({ ...value, recommendedOnly: on })}>
            Recommended only
          </Toggle>
          <Toggle checked={value.notVisitedOnly} onChange={(on) => onChange({ ...value, notVisitedOnly: on })}>
            Not visited
          </Toggle>
        </fieldset>
        {cats.length > 0 && (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="eyebrow mb-2">Categories</legend>
            {cats.map((c) => (
              <Toggle key={c} checked={value.categories.includes(c)} onChange={(on) => toggleCat(c, on)}>
                <Icon name={CATEGORIES[c].icon} className="size-4" />
                {CATEGORIES[c].label}
              </Toggle>
            ))}
          </fieldset>
        )}
      </div>
    </section>
  )
}
