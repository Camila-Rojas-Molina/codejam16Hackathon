// DAILY CHALLENGES: each one is a tear-off sheet ticket. The stub carries the reward; the body
// the task, progress and the one daily refresh.
import { useState } from 'react'
import Icon from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import { ErrorText } from '../../../components/ui/Fields'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import type { QuestView } from '../view'
import { QuestActions, ViewProgress } from './QuestCard'

export default function DailyTicket({
  view,
  canRefresh,
  highlight = false,
}: {
  view: QuestView
  /** The day's refresh is still available (the economy says so). */
  canRefresh: boolean
  highlight?: boolean
}) {
  const { refreshDaily, economyPending } = useStore()
  const [error, setError] = useState<string | null>(null)
  const { a, state } = view
  const refreshing = economyPending.includes(`refresh:${a.id}`)
  const showRefresh = canRefresh && state === 'active'

  async function refresh() {
    setError(null)
    try {
      await refreshDaily(a.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t swap that one. Try again.')
    }
  }

  return (
    <article
      id={`quest-${a.id}`}
      aria-labelledby={`quest-${a.id}-title`}
      className={cn(
        '@container scroll-mt-24 border-2 border-ink',
        state === 'claimed' ? 'bg-teal-soft' : 'sheet-grain',
        highlight ? 'shadow-block outline-4 outline-offset-4 outline-saffron' : 'shadow-block-sm',
      )}
    >
      <div className="flex h-full flex-col @[19rem]:flex-row">
      {/* Stub: reward, separated by a perforated rule (beside the body, or on top when narrow). */}
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-dashed border-ink bg-saffron-soft px-4 py-2 @[19rem]:w-20 @[19rem]:flex-col @[19rem]:justify-center @[19rem]:gap-1 @[19rem]:border-r-2 @[19rem]:border-b-0 @[19rem]:px-1 @[19rem]:py-3 @[19rem]:text-center">
        <Icon name={view.icon} className="size-8 @[19rem]:size-9" />
        <span className="font-display text-xl leading-none tabular-nums">+{a.reward}</span>
        <span className="eyebrow text-[0.6rem]">points</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id={`quest-${a.id}-title`} className="text-xl leading-tight break-words">
            {view.title}
          </h3>
          {state === 'claimed' && (
            <Badge stamp className="shrink-0 bg-sheet text-xs">
              Done
            </Badge>
          )}
        </div>
        <p className="text-sm leading-snug">{view.description}</p>
        <p className="flex items-start gap-2 text-sm font-bold">
          <Icon name="flag" accent="sienna" className="mt-0.5 size-4 shrink-0" />
          {view.objective}
        </p>
        <ViewProgress view={view} />
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <QuestActions view={view} compact claimLabel={`Claim +${a.reward}`} />
          {showRefresh && (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'min-h-11' })}
              aria-label={`Refresh: swap “${view.title}” for a different challenge`}
            >
              <Icon name="shuffle" accent="none" className="size-4" />
              {refreshing ? 'Swapping…' : 'Refresh'}
            </button>
          )}
        </div>
        <ErrorText className="mt-0">{error}</ErrorText>
      </div>
      </div>
    </article>
  )
}
