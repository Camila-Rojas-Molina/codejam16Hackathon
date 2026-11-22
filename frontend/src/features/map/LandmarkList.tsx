// The places as a plain list: the accessible way through the map (and the whole catalogue when the
// map can't load). Each row says its state in words, not only with the pin. Shown in pages of 50.
import { useState } from 'react'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkSummary } from '../explore/types'
import { PIN_STATE_LABEL, categoryLabel, formatVisited, pinState } from './landmarkMeta'
import { LandmarkPin } from './Pins'

const PAGE = 50

type Props = {
  items: LandmarkSummary[]
  selectedId: string | null
  onSelect: (l: LandmarkSummary) => void
  label: string
  empty: string
  className?: string
}

export default function LandmarkList({ items, selectedId, onSelect, label, empty, className }: Props) {
  const [shown, setShown] = useState(PAGE)
  if (items.length === 0) return <p className={cn('p-4 text-sm', className)}>{empty}</p>

  return (
    <div className={className}>
      <ul aria-label={label} className="divide-y-2 divide-ink/15">
        {items.slice(0, shown).map((l) => {
          const state = pinState(l)
          const selected = l.id === selectedId
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onSelect(l)}
                aria-current={selected || undefined}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 border-l-4 px-3 py-2 text-left transition-colors hover:bg-saffron-soft',
                  l.recommended ? 'border-saffron' : 'border-transparent',
                  selected && 'bg-saffron-soft',
                )}
              >
                <LandmarkPin state={state} category={l.category} selected={selected} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.name}</span>
                  <span className="block text-xs">
                    {categoryLabel(l.category)} · {l.visited && l.visitedAt ? `Visited ${formatVisited(l.visitedAt)}` : PIN_STATE_LABEL[l.visited ? 'visited' : 'new']}
                    {l.recommended && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center gap-0.5 bg-saffron-soft px-1 font-bold">
                          <Icon name="star" className="size-3" />
                          Recommended
                        </span>
                      </>
                    )}
                  </span>
                </span>
                <Icon name="arrow-right" accent="none" strokeWidth={2.2} className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
      {items.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="min-h-12 w-full border-t-2 border-ink text-sm font-bold tracking-[0.08em] uppercase hover:bg-saffron-soft">
          Show more ({items.length - shown} left)
        </button>
      )}
    </div>
  )
}
