// Shared pieces of every quest card: the ruled progress bar, the reward chip, the time-left line
// and the action row (go / claim / done). Each category's card (WeeklyHero, DailyTicket,
// AdventurePostcard, StarterChecklist) is built from these.
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { Mascot } from '../../../components/illustrations/Mascot'
import Button, { ArrowCell } from '../../../components/ui/Button'
import { ErrorText } from '../../../components/ui/Fields'
import { arrowButtonClasses, arrowLabel, type ArrowTone } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { useNow } from '../useChallenges'
import { formatTimeLeft, type QuestView } from '../view'

/** Ruled progress bar: a fill over hatching, with the count printed on top. */
export function QuestProgress({
  progress,
  target,
  label,
  fill = 'bg-saffron',
  className,
}: {
  progress: number
  target: number
  label: string
  /** Fill colour class (token). */
  fill?: string
  className?: string
}) {
  const safeTarget = Math.max(1, target)
  const value = Math.min(progress, safeTarget)
  const pct = Math.round((value / safeTarget) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeTarget}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${safeTarget}`}
      className={cn('hatch-soft relative h-7 overflow-hidden border-2 border-ink bg-sheet', className)}
    >
      <div className={cn('absolute inset-y-0 left-0 transition-[width] duration-500 ease-spring', fill)} style={{ width: `${pct}%` }} />
      <span className="absolute inset-0 grid place-items-center">
        <span className="bg-sheet px-2 text-xs font-bold text-ink tabular-nums">
          {value} / {safeTarget}
        </span>
      </span>
    </div>
  )
}

/** Progress for a quest view (claimed quests show full). */
export function ViewProgress({ view, fill, className }: { view: QuestView; fill?: string; className?: string }) {
  const { a } = view
  return (
    <QuestProgress
      progress={view.state === 'claimed' ? a.target : a.progress}
      target={a.target}
      label={`${view.title} progress`}
      fill={fill}
      className={className}
    />
  )
}

export function RewardChip({ points, className }: { points: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 border-2 border-ink bg-saffron py-0.5 pr-2 pl-1 text-xs font-bold text-ink', className)}>
      <Icon name="coin" accent="sheet" className="size-5" />+{points.toLocaleString()}
      <span className="sr-only"> points</span>
    </span>
  )
}

/** "Resets in 3 h 12 min" for an ISO time, updating every half minute. */
export function TimeLeft({ until, prefix = 'Resets in', className }: { until: string | null | undefined; prefix?: string; className?: string }) {
  const now = useNow()
  const at = until ? Date.parse(until) : NaN
  if (!Number.isFinite(at)) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon name="clock" accent="none" className="size-4" />
      <span>
        {prefix}{' '}
        <time dateTime={until ?? undefined} className="font-bold tabular-nums">
          {formatTimeLeft(at - now)}
        </time>
      </span>
    </span>
  )
}

/**
 * What you can do with a quest right now: go and make progress, claim the reward, or nothing (done
 * / expired). Claiming goes through the store; the reward shown is the assignment's own.
 */
export function QuestActions({
  view,
  goTone = 'sheet',
  claimLabel,
  compact = false,
  className,
}: {
  view: QuestView
  goTone?: ArrowTone
  claimLabel?: string
  /** Smaller buttons and a shorter done line (tickets, checklist rows). */
  compact?: boolean
  className?: string
}) {
  const { claimQuest, economyPending } = useStore()
  const [error, setError] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState(false)
  const { a, state, action } = view
  const busy = economyPending.includes(`claim:${a.id}`)

  async function claim() {
    setError(null)
    try {
      await claimQuest(a.id)
      setJustClaimed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t claim that. Try again.')
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {state === 'ready' && (
          <Button onClick={claim} disabled={busy} icon="coin" size={compact ? 'sm' : 'md'} className={compact ? 'min-h-11' : undefined}>
            {busy ? 'Claiming…' : (claimLabel ?? `Claim ${a.reward.toLocaleString()} points`)}
          </Button>
        )}
        {state === 'active' && action && (
          <Link to={action.to} className={arrowButtonClasses({ tone: goTone, size: compact ? 'sm' : 'md' })}>
            <span className={arrowLabel}>{action.label}</span>
            <ArrowCell />
          </Link>
        )}
        {state === 'claimed' && (
          <p className="flex items-center gap-3 font-bold" role={justClaimed ? 'status' : undefined}>
            {justClaimed && !compact && <Mascot pose="leap" className="h-16" label="Migo leaping for joy" />}
            <span className="flex items-center gap-2">
              <Icon name="check" accent="none" strokeWidth={2.6} className="size-5 text-teal-deep" />+{a.reward.toLocaleString()} points earned{compact ? '' : '. Nice!'}
            </span>
          </p>
        )}
        {state === 'expired' && <p className="text-sm font-semibold">This one has expired.</p>}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}

/** Solo / with a teammate / either, as a small ruled label. */
export function CompanyBadge({ company, className }: { company: 'solo' | 'companion' | 'either' | undefined; className?: string }) {
  const c = company ?? 'either'
  const text = c === 'solo' ? 'Solo' : c === 'companion' ? 'With a teammate' : 'Solo or together'
  return (
    <span className={cn('inline-flex items-center gap-1 border-2 border-ink bg-sheet px-2 py-0.5 text-[0.68rem] leading-tight font-bold tracking-[0.12em] text-ink uppercase', className)}>
      <Icon name={c === 'solo' ? 'user' : c === 'companion' ? 'people2' : 'venn'} className="size-4" accent="teal" />
      {text}
    </span>
  )
}
