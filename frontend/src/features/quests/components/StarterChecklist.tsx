// GETTING STARTED: a printed checklist. Unfinished items stay on the list; finished ones fold
// into a "Done" drawer instead of coming back.
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import type { QuestView } from '../view'
import { QuestActions, QuestProgress, RewardChip } from './QuestCard'

function Row({ view, highlight }: { view: QuestView; highlight: boolean }) {
  const { a, state } = view
  const done = state === 'claimed'
  return (
    <li
      id={`quest-${a.id}`}
      className={cn('scroll-mt-24 border-b-2 border-ink last:border-b-0', state === 'ready' && 'bg-saffron-soft', highlight && 'outline-4 -outline-offset-4 outline-saffron')}
    >
      <div className="flex items-start gap-3 p-4">
        {/* The tick box. */}
        <span
          className={cn('mt-0.5 grid size-7 shrink-0 place-items-center border-2 border-ink', done ? 'bg-teal' : state === 'ready' ? 'bg-saffron' : 'bg-sheet')}
          aria-hidden
        >
          {(done || state === 'ready') && <Icon name="check" accent="none" strokeWidth={2.8} className="size-5" />}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Icon name={view.icon} className="size-6 shrink-0" />
            <h3 className={cn('font-sans text-base font-bold tracking-normal normal-case', done && 'line-through decoration-2')}>{view.title}</h3>
            <RewardChip points={a.reward} />
          </div>
          <p className="text-sm leading-snug">{view.objective}</p>
          {!done && a.target > 1 && <QuestProgress progress={a.progress} target={a.target} label={`${view.title} progress`} className="max-w-xs" />}
          {!done && <QuestActions view={view} compact claimLabel={`Claim +${a.reward}`} />}
        </div>
      </div>
    </li>
  )
}

export default function StarterChecklist({ todo, done, highlightId }: { todo: QuestView[]; done: QuestView[]; highlightId: string | null }) {
  const total = todo.length + done.length
  // Ready-to-claim first, then the rest in catalogue order.
  const ordered = [...todo].sort((x, y) => Number(y.state === 'ready') - Number(x.state === 'ready'))
  return (
    <div className="sheet-grain border-2 border-ink">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
        <p className="font-bold">
          {done.length} of {total} done
        </p>
        <QuestProgress progress={done.length} target={Math.max(1, total)} label="Getting started progress" fill="bg-teal" className="w-40" />
      </div>
      {ordered.length > 0 ? (
        <ul>
          {ordered.map((v) => (
            <Row key={v.a.id} view={v} highlight={highlightId === `quest-${v.a.id}`} />
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 p-4 font-semibold">
          <Icon name="trophy" className="size-6" />
          All set up. Nice work!
        </p>
      )}
      {done.length > 0 && (
        <details className="group border-t-2 border-ink">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-bold hover:bg-saffron-soft">
            <span className="flex items-center gap-2">
              <Icon name="check" accent="none" strokeWidth={2.6} className="size-5 text-teal-deep" />
              Done ({done.length})
            </span>
            <Icon name="chevron-down" accent="none" className="size-5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="border-t-2 border-ink">
            {done.map((v) => (
              <Row key={v.a.id} view={v} highlight={false} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
