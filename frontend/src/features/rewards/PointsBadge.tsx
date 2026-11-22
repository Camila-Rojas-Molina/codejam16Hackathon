// The points balance with its coin, joined to a shop cell: tapping it opens the shop, where points
// are spent. (Points are earned in QUESTS.)
import { Link } from 'react-router'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'
import { pointsBalance } from '../profile/model'

type PointsBadgeProps = {
  className?: string
  /** Phones: the balance and a shop glyph, without the "pts" / "Shop" words. */
  compact?: boolean
}

export default function PointsBadge({ className, compact = false }: PointsBadgeProps) {
  const { profile } = useStore()
  const balance = pointsBalance(profile?.rewards)
  const label = `${balance.toLocaleString()} point${balance === 1 ? '' : 's'}, open the shop`
  return (
    <Link
      to="/shop"
      title="Spend your MIGO points in the shop"
      aria-label={label}
      className={cn(
        'group/points inline-flex min-h-11 shrink-0 items-stretch border-2 border-ink bg-saffron text-ink',
        'transition-[background-color,color,transform] hover:bg-ink hover:text-saffron active:translate-x-px active:translate-y-px',
        className,
      )}
    >
      <span className={cn('flex flex-1 items-center gap-1.5 py-1 pl-1.5', compact ? 'pr-2' : 'pr-3')}>
        <Icon name="coin" accent="sheet" className="size-7" />
        <span className="font-display text-lg leading-none tabular-nums" data-testid="points-balance">
          {balance.toLocaleString()}
        </span>
        {!compact && <span className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">pts</span>}
      </span>
      {/* The shop cell: says where the tap goes. */}
      <span
        className={cn(
          'flex items-center gap-1.5 border-l-2 border-ink bg-sheet text-ink transition-colors group-hover/points:bg-saffron-soft',
          compact ? 'px-1.5' : 'px-2.5',
        )}
        aria-hidden
      >
        <Icon name="shop" className="size-6 transition-transform group-hover/points:-rotate-6" />
        {!compact && <span className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">Shop</span>}
      </span>
    </Link>
  )
}
