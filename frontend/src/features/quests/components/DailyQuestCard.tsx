// Sidebar shortcut to today's Daily Quest in the QUESTS tab.
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { ArrowCell } from '../../../components/ui/Button'
import { arrowButtonClasses, arrowLabel } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { useChallenges } from '../useChallenges'
import { QuestProgress, RewardChip } from './QuestCard'

export default function DailyQuestCard({ className }: { className?: string }) {
  const { daily } = useChallenges()
  if (!daily) return null
  const { challenge: c, status } = daily
  return (
    <section aria-labelledby="daily-quest-title" className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon name="sun" className="size-4" />
          Daily quest
        </p>
        <RewardChip points={c.reward} />
      </div>
      <div className="mt-3 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center border-2 border-ink bg-saffron-soft" aria-hidden>
          <Icon name={c.icon} className="size-8" />
        </span>
        <div className="min-w-0">
          <h2 id="daily-quest-title" className="text-xl">
            {c.title}
          </h2>
          <p className="text-sm leading-snug">{c.description}</p>
        </div>
      </div>
      <QuestProgress state={daily} className="mt-4" />
      {/* One teal button (the sidebar's Shop link is sheet/saffron, so the two never look alike). */}
      <Link to={`/quests#quest-${c.id}`} className={arrowButtonClasses({ tone: 'teal', size: 'sm', fullWidth: true, className: 'mt-4' })}>
        <span className={arrowLabel}>{status === 'ready' ? 'Claim reward' : status === 'claimed' ? 'Done today · view quests' : 'Open quest'}</span>
        <ArrowCell />
      </Link>
    </section>
  )
}
