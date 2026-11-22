// The landmark pin and its four states, shared by the map markers, the legend and the list:
//   new                  ink-outlined sheet pin with the category glyph
//   visited              teal pin with a check
//   recommended          saffron star badge on the pin's shoulder
//   recommended+visited  teal pin with a check and the star badge
// Glyph sizes use `!` because Icon's own size-6 would otherwise win at these small sizes.
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkCategory } from '../explore/types'
import { categoryOf } from './geo'

export type PinState = { visited: boolean; recommended: boolean }

type PinProps = PinState & {
  category?: LandmarkCategory
  selected?: boolean
  /** "md" on the map (44px target), "sm" in the legend and list. */
  size?: 'sm' | 'md'
  className?: string
}

const PIN_PATH = 'M16 38.5S28 26.3 28 16A12 12 0 0 0 4 16c0 10.3 12 22.5 12 22.5z'

export default function LandmarkPin({ visited, recommended, category, selected, size = 'md', className }: PinProps) {
  const sm = size === 'sm'
  return (
    <span
      aria-hidden
      // The visited pin is a "day island" so its check and outline stay dark ink on teal at night.
      className={cn('relative inline-block shrink-0', sm ? 'h-6 w-5' : 'h-10 w-8', sm && recommended && 'mr-2', visited && 'day-island', className)}
    >
      <svg
        viewBox="0 0 32 40"
        className={cn(
          'absolute inset-0 size-full overflow-visible transition-transform duration-150 ease-out',
          !sm && 'origin-bottom drop-shadow-[2px_2px_0_var(--shadow-ink)]',
          selected && 'scale-125',
        )}
      >
        <path
          d={PIN_PATH}
          fill={selected && !visited ? 'var(--color-saffron-soft)' : visited ? 'var(--color-teal)' : 'var(--color-sheet)'}
          stroke="var(--color-ink)"
          strokeWidth={sm ? 3 : selected ? 2.6 : 2.2}
          strokeLinejoin="round"
        />
      </svg>
      <span className={cn('absolute inset-x-0 grid place-items-center text-ink', sm ? 'top-0.5 h-3.5' : 'top-[5px] h-[22px]', selected && !sm && '-translate-y-1.5 scale-125')}>
        {visited ? (
          <Icon name="check" accent="none" strokeWidth={sm ? 3.4 : 3} className={sm ? 'size-3!' : 'size-4!'} />
        ) : category && !sm ? (
          <Icon name={categoryOf(category).icon} accent="saffron" strokeWidth={2} className="size-4!" />
        ) : (
          <span className={cn('block rounded-full bg-ink', sm ? 'size-1.5' : 'size-2')} />
        )}
      </span>
      {recommended && (
        <span
          className={cn(
            'day-island absolute grid place-items-center border-ink bg-saffron',
            sm ? '-top-1 -right-2.5 size-3.5 border' : '-top-1.5 -right-2.5 size-5 border-2',
            selected && !sm && '-translate-y-2 translate-x-1',
          )}
        >
          <Icon name="star" accent="sheet" strokeWidth={sm ? 3 : 2.6} className={sm ? 'size-3!' : 'size-3.5!'} />
        </span>
      )}
    </span>
  )
}
