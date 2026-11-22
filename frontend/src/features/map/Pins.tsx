// The map's marker art, shared by the map, its legend and the list. Four pin states:
//   not visited            paper pin, ink outline, category glyph
//   visited                teal pin with an ink check
//   recommended            paper pin with a saffron star badge
//   recommended + visited  teal pin with check and the star badge
// Recommended pins also get a pulsing saffron halo. Cluster bubbles show a count, a teal ring for
// the share already visited, and a saffron outer ring plus the star when any landmark inside is
// recommended. State is never told by colour alone (glyph + badge).
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import type { LandmarkCategory } from '../explore/types'
import { categoryIcon, type PinState } from './landmarkMeta'

const PIN_PATH = 'M14 1.5C7.1 1.5 1.5 7 1.5 13.8c0 8.4 10.2 18.9 11.6 20.3a1.3 1.3 0 0 0 1.8 0C16.3 32.7 26.5 22.2 26.5 13.8 26.5 7 20.9 1.5 14 1.5Z'

function StarBadge({ className }: { className?: string }) {
  return (
    <span className={cn('absolute grid size-4 place-items-center rounded-full border-2 border-ink bg-saffron', className)} aria-hidden>
      <svg viewBox="0 0 10 10" className="size-2.5 fill-ink">
        <path d="M5 .6l1.3 2.8 3 .3-2.3 2 .7 3L5 7.2 2.3 8.7l.7-3-2.3-2 3-.3Z" />
      </svg>
    </span>
  )
}

type PinProps = {
  state: PinState
  category: LandmarkCategory
  selected?: boolean
  /** 'sm' for the legend and list rows. */
  size?: 'sm' | 'md'
  className?: string
}

/** Just the pin (no hit area). Its tip is the bottom centre. */
export function LandmarkPin({ state, category, selected = false, size = 'md', className }: PinProps) {
  const visited = state === 'visited' || state === 'both'
  const recommended = state === 'recommended' || state === 'both'
  return (
    <span
      className={cn('relative inline-block shrink-0', size === 'sm' ? 'h-6 w-[1.1rem]' : 'h-9 w-7', className)}
      style={{ filter: 'drop-shadow(2px 2px 0 var(--shadow-ink))' }}
      aria-hidden
    >
      <svg viewBox="0 0 28 36" className="absolute inset-0 size-full overflow-visible">
        <path
          d={PIN_PATH}
          fill={selected ? 'var(--color-saffron)' : visited ? 'var(--color-teal)' : 'var(--color-sheet)'}
          stroke="var(--color-ink)"
          strokeWidth={selected ? 3 : 2}
        />
        {visited && <path d="M8.6 14l3.7 3.7 7.2-7.4" fill="none" stroke="var(--color-ink)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {!visited && (
        <span className={cn('absolute inset-x-0 grid place-items-center', size === 'sm' ? 'top-[3px]' : 'top-1.5')}>
          <Icon name={categoryIcon(category)} accent="none" strokeWidth={2} className={size === 'sm' ? 'size-3' : 'size-4'} />
        </span>
      )}
      {recommended && <StarBadge className={size === 'sm' ? '-top-1.5 -right-2 scale-75' : '-top-1.5 -right-2'} />}
    </span>
  )
}

/** A landmark's marker content: the pin inside a 44 px touch target, tip at the bottom centre. */
export function LandmarkMarker(props: PinProps) {
  const recommended = props.state === 'recommended' || props.state === 'both'
  return (
    <span className={cn('relative flex h-12 w-11 cursor-pointer items-end justify-center transition-transform', props.selected && 'scale-125')} style={{ transformOrigin: '50% 100%' }}>
      {/* Recommended: a saffron halo behind the pin head, gently pulsing (still when motion is reduced). */}
      {recommended && (
        <span className="absolute top-1.5 left-1/2 size-10 -translate-x-1/2 rounded-full border-[3px] border-saffron bg-saffron/35 motion-safe:animate-pulse" aria-hidden />
      )}
      <LandmarkPin {...props} />
    </span>
  )
}

/** A cluster's marker content (centred on its position). */
export function ClusterBubble({ count, visited, recommended }: { count: number; visited: number; recommended: boolean }) {
  const size = count < 10 ? 'size-11' : count < 100 ? 'size-12' : 'size-14'
  const share = Math.round((visited / count) * 100)
  return (
    <span className={cn('relative grid cursor-pointer place-items-center rounded-full border-2 border-ink shadow-block-sm', size)}
      style={{ background: `conic-gradient(var(--color-teal) 0 ${share}%, var(--color-sheet) ${share}% 100%)` }}
      aria-hidden
    >
      <span className="grid size-[calc(100%-10px)] place-items-center rounded-full border-2 border-ink bg-sheet font-display text-base leading-none text-ink">
        {count > 999 ? '999+' : count}
      </span>
      {/* Holds at least one recommended landmark: a saffron outer ring, plus the star. */}
      {recommended && <span className="absolute -inset-1.5 rounded-full border-[3px] border-saffron motion-safe:animate-pulse" aria-hidden />}
      {recommended && <StarBadge className="-top-1 -right-1" />}
    </span>
  )
}

/** The person's one-shot position. */
export function UserDot() {
  return (
    <span className="relative grid size-6 place-items-center" aria-hidden>
      <span className="absolute inset-0 rounded-full bg-teal-deep/25" />
      <span className="size-4 rounded-full border-[3px] border-sheet bg-teal-deep shadow-[0_0_0_2px_var(--color-ink)]" />
    </span>
  )
}
