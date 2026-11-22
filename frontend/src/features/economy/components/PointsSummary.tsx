// Balance, total earned and total spent, in one ruled block. Reads the economy from the store.
//   <PointsSummary />            big balance cell + earned/spent row (Quests page, Profile)
//   <PointsSummary compact />    one tight row, for sidebars and headers
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { useEconomy } from '../useEconomy'

type PointsSummaryProps = {
  compact?: boolean
  className?: string
}

export default function PointsSummary({ compact = false, className }: PointsSummaryProps) {
  const { balance, earnedTotal, spentTotal, source, loading } = useEconomy()
  const fmt = (n: number) => n.toLocaleString()

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 border-2 border-ink bg-saffron px-3 py-2', className)} aria-busy={loading}>
        <span className="flex items-center gap-2">
          <Icon name="coin" accent="sheet" className="size-8" />
          <span className="font-display text-2xl leading-none tabular-nums">{fmt(balance)}</span>
          <span className="eyebrow">pts</span>
        </span>
        <span className="text-xs font-semibold">
          {fmt(earnedTotal)} earned · {fmt(spentTotal)} spent
        </span>
      </div>
    )
  }

  return (
    <div className={cn('sheet-grain border-2 border-ink shadow-block-sm', className)} aria-busy={loading}>
      <div className="flex items-center gap-4 border-b-2 border-ink bg-saffron p-4 sm:p-5">
        <Icon name="coin" accent="sheet" className="size-12 shrink-0 sm:size-14" />
        <div className="min-w-0">
          <p className="eyebrow">Balance</p>
          <p className="font-display text-4xl leading-none tabular-nums sm:text-5xl" data-testid="economy-balance">
            {fmt(balance)}
          </p>
          <p className="text-sm font-semibold">points to spend</p>
        </div>
      </div>
      <dl className="grid grid-cols-2">
        <div className="border-r-2 border-ink px-4 py-3 sm:px-5">
          <dt className="eyebrow flex items-center gap-1.5">
            <Icon name="trophy" className="size-5" />
            Earned
          </dt>
          <dd className="font-display text-2xl leading-tight tabular-nums">{fmt(earnedTotal)}</dd>
        </div>
        <div className="px-4 py-3 sm:px-5">
          <dt className="eyebrow flex items-center gap-1.5">
            <Icon name="bag" className="size-5" />
            Spent
          </dt>
          <dd className="font-display text-2xl leading-tight tabular-nums">{fmt(spentTotal)}</dd>
        </div>
      </dl>
      {source === 'device' && (
        // Honest label: without the server these numbers live in this browser only.
        <p className="flex items-start gap-2 border-t-2 border-ink bg-sandy-soft px-4 py-2 text-xs font-semibold sm:px-5">
          <Icon name="info" className="size-4 shrink-0" />
          Offline mode: these points are kept in this browser only, not on a server.
        </p>
      )}
    </div>
  )
}
