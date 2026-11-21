// Sidebar shortcut to today's Daily Quest in the QUESTS tab.
import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import { useChallenges } from '../useChallenges'
import { QuestProgress, RewardChip } from './QuestCard'

export default function DailyQuestCard({ className }: { className?: string }) {
  const { daily } = useChallenges()
  if (!daily) return null
  const { challenge: c, status } = daily
  return (
    <section aria-labelledby="daily-quest-title" className={cn('rounded-[1.5rem_1.3rem_1.6rem_1.2rem] border-[3px] border-navy bg-paper p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-type text-xs tracking-wider uppercase">Daily quest</p>
        <RewardChip points={c.reward} />
      </div>
      <div className="mt-2 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border-[3px] border-navy bg-bubble text-2xl" aria-hidden>
          {c.icon}
        </span>
        <div className="min-w-0">
          <h2 id="daily-quest-title" className="text-xl leading-tight">
            {c.title}
          </h2>
          <p className="text-sm leading-snug">{c.description}</p>
        </div>
      </div>
      <QuestProgress state={daily} className="mt-3" />
      <Link
        to={`/quests#quest-${c.id}`}
        className="mt-3 flex min-h-11 items-center justify-center rounded-full border-[3px] border-navy bg-bubble-light font-type text-xs tracking-wider uppercase transition-transform active:scale-95"
      >
        {status === 'ready' ? 'Claim reward →' : status === 'claimed' ? 'Done today ✓ View quests' : 'Open quest →'}
      </Link>
    </section>
  )
}
