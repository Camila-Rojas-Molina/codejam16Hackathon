// The points balance with its coin. Links to where points come from and go.
import { Link } from 'react-router'
import { PointsIcon } from '../../components/illustrations/Icons'
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
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[3px] border-navy bg-paper py-1 pr-3 pl-1.5 font-type text-sm tracking-wider text-navy transition-transform active:scale-95',
        className,
      )}
    >
      <PointsIcon className="size-7" />
      <span className="tabular-nums" data-testid="points-balance">
        {balance.toLocaleString()}
      </span>
      {!compact && <span className="text-xs uppercase">pts</span>}
    </Link>
  )
}
