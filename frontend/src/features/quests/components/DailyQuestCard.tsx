// Sidebar summary of today's daily challenges ("2 of 3 done"), linking to them on the Quests page.
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { ArrowCell } from '../../../components/ui/Button'
import { arrowButtonClasses, arrowLabel } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { useChallenges } from '../useChallenges'
import { QuestProgress, TimeLeft } from './QuestCard'
import { useStore } from '../../../store/useStore'

export default function DailyQuestCard({ className }: { className?: string }) {
  const { economy } = useStore()
  const { ready, daily, dailyDoneCount } = useChallenges()
  if (!ready || daily.length === 0) return null
  const readyToClaim = daily.filter((v) => v.state === 'ready').length
  const allDone = dailyDoneCount === daily.length
  return (
    <section aria-labelledby="daily-quest-title" className={cn('p-5', className)}>
      <p className="eyebrow flex items-center gap-1.5">
        <Icon name="sun" className="size-4" />
        Daily challenges
      </p>
      <h2 id="daily-quest-title" className="mt-2 text-xl">
        {dailyDoneCount} of {daily.length} done
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {daily.map((v) => (
          <li key={v.a.id} className="flex items-center gap-2">
            <span
              className={cn('grid size-5 shrink-0 place-items-center border-2 border-ink', v.state === 'claimed' ? 'bg-teal' : v.state === 'ready' ? 'bg-saffron' : 'bg-sheet')}
              aria-hidden
            >
              {v.state !== 'active' && <Icon name="check" accent="none" strokeWidth={3} className="size-3.5" />}
            </span>
            <span className={cn('min-w-0 flex-1 truncate', v.state === 'claimed' && 'line-through decoration-2')}>{v.title}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums">+{v.a.reward}</span>
            <span className="sr-only">{v.state === 'claimed' ? '(done)' : v.state === 'ready' ? '(ready to claim)' : `(${v.a.progress} of ${v.a.target})`}</span>
          </li>
        ))}
      </ul>
      <QuestProgress progress={dailyDoneCount} target={daily.length} label="Daily challenges done" fill="bg-teal" className="mt-3" />
      {economy && <TimeLeft until={economy.nextDailyReset} prefix="New ones in" className="mt-2 text-xs" />}
      {/* One teal button (the sidebar's Shop link is sheet/saffron, so the two never look alike). */}
      <Link to="/quests#daily" className={arrowButtonClasses({ tone: 'teal', size: 'sm', fullWidth: true, className: 'mt-4' })}>
        <span className={arrowLabel}>{readyToClaim > 0 ? `Claim ${readyToClaim} reward${readyToClaim === 1 ? '' : 's'}` : allDone ? 'All done · view quests' : 'Open dailies'}</span>
        <ArrowCell />
      </Link>
    </section>
  )
}
