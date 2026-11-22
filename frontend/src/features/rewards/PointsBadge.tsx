// The points balance with its coin. Links to where points come from and go.
import { Link } from 'react-router'
import Icon from '../../components/icons/Icon'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'
import { pointsBalance } from '../profile/model'

export default function PointsBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { profile } = useStore()
  const balance = pointsBalance(profile?.rewards)
  return (
    <Link
      to="/quests"
      title="MIGO points: earn them from quests, spend them in the shop"
      aria-label={`${balance} MIGO points`}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-saffron py-1 pr-3 pl-1.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-saffron',
        className,
      )}
    >
      <Icon name="coin" accent="sheet" className="size-7" />
      <span className="font-display text-lg leading-none tabular-nums" data-testid="points-balance">
        {balance.toLocaleString()}
      </span>
      {!compact && <span className="text-[0.65rem] tracking-[0.12em] uppercase">pts</span>}
    </Link>
  )
}
