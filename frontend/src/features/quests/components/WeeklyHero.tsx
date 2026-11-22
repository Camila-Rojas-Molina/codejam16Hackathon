// WEEKLY CHALLENGE: the week's one big quest, as a saffron hero poster with a rubber stamp.
import Icon from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'
import type { QuestView } from '../view'
import { CompanyBadge, QuestActions, TimeLeft, ViewProgress } from './QuestCard'

export default function WeeklyHero({ view, highlight = false, className }: { view: QuestView; highlight?: boolean; className?: string }) {
  const { a, state, def } = view
  return (
    <article
      id={`quest-${a.id}`}
      aria-labelledby={`quest-${a.id}-title`}
      className={cn(
        'relative scroll-mt-24 border-2 border-ink bg-saffron text-ink shadow-block',
        highlight && 'outline-4 outline-offset-4 outline-teal',
        className,
      )}
    >
      {/* Ticket head: category and the big reward. */}
      <div className="flex items-stretch border-b-2 border-ink">
        <span className="grid w-20 shrink-0 place-items-center border-r-2 border-ink bg-sheet sm:w-28" aria-hidden>
          <Icon name={view.icon} className="size-12 sm:size-16" />
        </span>
        <div className="min-w-0 flex-1 px-4 py-3 sm:px-6">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon name="calendar" accent="sheet" className="size-4" />
            Weekly challenge
          </p>
          <h3 id={`quest-${a.id}-title`} className="mt-1 text-2xl leading-tight break-words sm:text-3xl">
            {view.title}
          </h3>
        </div>
        <div className="hidden shrink-0 flex-col items-center justify-center border-l-2 border-ink bg-sheet px-5 sm:flex">
          <span className="font-display text-4xl leading-none tabular-nums">+{a.reward.toLocaleString()}</span>
          <span className="eyebrow mt-1">points</span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <p className="max-w-prose text-base sm:text-lg">{view.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-sheet px-2 py-1 text-sm font-bold">
            <Icon name="flag" accent="sienna" className="size-5" />
            {view.objective}
          </span>
          {def?.company && <CompanyBadge company={def.company} />}
          {/* Phone: the reward goes here (the side cell is hidden). */}
          <span className="inline-flex items-center gap-1 border-2 border-ink bg-sheet px-2 py-1 text-sm font-bold sm:hidden">
            <Icon name="coin" className="size-5" />+{a.reward.toLocaleString()} points
          </span>
        </div>
        <ViewProgress view={view} fill="bg-teal" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuestActions view={view} goTone="sheet" />
          {state !== 'claimed' && <TimeLeft until={a.expiresAt} prefix="Ends in" className="text-sm" />}
        </div>
      </div>

      {state === 'claimed' && (
        <Badge stamp className="absolute -top-3 right-4 bg-sheet sm:top-auto sm:right-6 sm:bottom-6">
          Done this week
        </Badge>
      )}
    </article>
  )
}
