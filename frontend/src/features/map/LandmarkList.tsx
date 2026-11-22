// The landmarks in view as a plain list: the screen-reader-friendly alternative to the pins, and
// the whole catalogue when the map itself can't load (no Maps key).
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkSummary } from '../explore/types'
import { categoryOf, pinStateLabel } from './geo'
import LandmarkPin from './LandmarkPin'

type Props = {
  landmarks: LandmarkSummary[]
  selectedId: string | null
  onSelect: (l: LandmarkSummary) => void
  /** Shown when the list is empty. */
  empty: string
  className?: string
}

export default function LandmarkList({ landmarks, selectedId, onSelect, empty, className }: Props) {
  const sorted = [...landmarks].sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.name.localeCompare(b.name))
  if (sorted.length === 0) return <p className={cn('p-4 text-sm', className)}>{empty}</p>
  return (
    <ul className={cn('divide-y-2 divide-ink', className)}>
      {sorted.map((l) => (
        <li key={l.id}>
          <button
            type="button"
            onClick={() => onSelect(l)}
            aria-current={l.id === selectedId ? 'true' : undefined}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-saffron-soft',
              l.id === selectedId && 'bg-saffron-soft',
            )}
          >
            <LandmarkPin size="sm" visited={l.visited} recommended={l.recommended} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold leading-tight">{l.name}</span>
              <span className="block text-xs">
                {categoryOf(l.category).label} · {pinStateLabel(l)}
              </span>
            </span>
            <Icon name="arrow-right" accent="none" strokeWidth={2.2} className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}
