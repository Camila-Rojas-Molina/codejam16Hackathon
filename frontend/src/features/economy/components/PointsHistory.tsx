// Recent points activity: what was earned (quests) and spent (shop), newest first. Reads the
// economy's ledger from the store (the server keeps the newest ~50).
//   <PointsHistory />                       up to 10 rows
//   <PointsHistory limit={5} runningBalance />  with the balance after each change
import type { ReactNode } from 'react'
import Icon, { type IconName } from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import type { LedgerEntry } from '../types'
import { useEconomy } from '../useEconomy'

type PointsHistoryProps = {
  /** Rows to show (default 10). */
  limit?: number
  /** Show the balance after each change. */
  runningBalance?: boolean
  /** Shown instead of the default empty message. */
  empty?: ReactNode
  className?: string
}

const ICONS: Record<LedgerEntry['kind'], IconName> = { quest: 'trophy', purchase: 'bag', legacy: 'scroll', adjustment: 'sparkle' }

/** What the row says: "Bought Sunnies" for purchases, the quest's title for rewards. */
function describe(e: LedgerEntry): string {
  const spent = e.kind === 'purchase' || (e.kind === 'legacy' && e.amount < 0)
  const label = e.label.trim() || (spent ? 'Shop item' : 'Points')
  return spent && !/^bought\b/i.test(label) ? `Bought ${label}` : label
}

function when(iso: string): string {
  const ms = Date.parse(iso)
  // Rows carried over from the first version may have no date.
  if (!Number.isFinite(ms) || ms <= 0) return 'Earlier'
  const d = new Date(ms)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : `−${Math.abs(n).toLocaleString()}`)

export default function PointsHistory({ limit = 10, runningBalance = false, empty, className }: PointsHistoryProps) {
  const { state, balance } = useEconomy()
  const entries = (state?.recent ?? []).slice(0, limit)

  if (entries.length === 0) {
    return (
      <div className={cn('border-2 border-ink px-4 py-4 sm:px-5', className)}>
        {empty ?? (
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="coin" className="size-6" />
            {state ? 'No points yet. Finish a quest to earn your first.' : 'Loading your points…'}
          </p>
        )}
      </div>
    )
  }

  // Balance after each row, walking back from the current balance (recent is newest first).
  const rows = entries.map((e, i) => ({ e, after: balance - entries.slice(0, i).reduce((n, x) => n + x.amount, 0) }))

  return (
    <ol aria-label="Recent points activity" className={cn('sheet-grain border-2 border-ink', className)}>
      {rows.map(({ e, after: total }, i) => (
        <li key={e.id} className={cn('flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5', i > 0 && 'border-t-2 border-ink')}>
          <span className={cn('grid size-9 shrink-0 place-items-center border-2 border-ink', e.amount < 0 ? 'bg-sienna-soft' : 'bg-teal-soft')} aria-hidden>
            <Icon name={ICONS[e.kind]} className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{describe(e)}</span>
            <span className="eyebrow block">
              <time dateTime={e.at}>{when(e.at)}</time>
              {runningBalance && <> · {total.toLocaleString()} after</>}
            </span>
          </span>
          <span className="font-display text-lg tabular-nums" aria-label={`${e.amount > 0 ? 'earned' : 'spent'} ${Math.abs(e.amount)} points`}>
            {signed(e.amount)}
          </span>
        </li>
      ))}
    </ol>
  )
}
