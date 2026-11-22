// The legend: one ruled chip per pin state, in a row that scrolls sideways on small phones.
import { cn } from '../../lib/cn'
import LandmarkPin, { type PinState } from './LandmarkPin'

const STATES: (PinState & { label: string })[] = [
  { visited: false, recommended: false, label: 'Not visited' },
  { visited: true, recommended: false, label: 'Visited' },
  { visited: false, recommended: true, label: 'Recommended' },
  { visited: true, recommended: true, label: 'Both' },
]

export default function MapLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Map legend" className={cn('flex gap-1.5 overflow-x-auto [scrollbar-width:none]', className)}>
      {STATES.map((s) => (
        <li
          key={s.label}
          className="sheet-grain flex min-h-9 shrink-0 items-center gap-1.5 border-2 border-ink py-1 pr-2.5 pl-2 text-[0.68rem] font-bold tracking-[0.1em] whitespace-nowrap uppercase"
        >
          <LandmarkPin size="sm" visited={s.visited} recommended={s.recommended} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
