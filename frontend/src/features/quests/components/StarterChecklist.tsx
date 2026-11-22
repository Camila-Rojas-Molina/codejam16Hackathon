// GETTING STARTED: a printed checklist. Unfinished items stay on the list; finished ones fold
// into a "Done" drawer instead of coming back.
import { useState } from 'react'
import Icon from '../../../components/icons/Icon'
import Button from '../../../components/ui/Button'
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
      <div className="@container flex items-start gap-3 px-4 py-3">
        {/* The tick box. */}
        <span
          className={cn('mt-0.5 grid size-7 shrink-0 place-items-center border-2 border-ink', done ? 'bg-teal' : state === 'ready' ? 'bg-saffron' : 'bg-sheet')}
          aria-hidden
        >
          {(done || state === 'ready') && <Icon name="check" accent="none" strokeWidth={2.8} className="size-5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 @md:flex-row @md:items-center @md:justify-between @md:gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Icon name={view.icon} className="size-6 shrink-0" />
              <h3 className={cn('font-sans text-base font-bold tracking-normal normal-case', done && 'line-through decoration-2')}>{view.title}</h3>
              <RewardChip points={a.reward} />
            </div>
            <p className="text-sm leading-snug">{view.objective}</p>
            {!done && a.target > 1 && <QuestProgress progress={a.progress} target={a.target} label={`${view.title} progress`} className="max-w-60" />}
          </div>
          {!done && <QuestActions view={view} compact claimLabel={`Claim +${a.reward}`} className="shrink-0" />}
        </div>
      </div>
    </li>
  )
}

/** Rows shown before "Show all" (ready-to-claim ones always show). */
const SHOWN = 6

export default function StarterChecklist({ todo, done, highlightId }: { todo: QuestView[]; done: QuestView[]; highlightId: string | null }) {
  const [all, setAll] = useState(false)
  const total = todo.length + done.length
  // Ready-to-claim first, then the rest in catalogue order.
  const sorted = [...todo].sort((x, y) => Number(y.state === 'ready') - Number(x.state === 'ready'))
  const highlighted = sorted.findIndex((v) => highlightId === `quest-${v.a.id}`)
  const limit = Math.max(SHOWN, sorted.filter((v) => v.state === 'ready').length, highlighted + 1)
  const ordered = all ? sorted : sorted.slice(0, limit)
  const hidden = sorted.length - ordered.length
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
      ) : null}
      {hidden > 0 && (
        <div className="border-t-2 border-ink p-2">
          <Button variant="ghost" size="sm" fullWidth onClick={() => setAll(true)} className="min-h-11">
            Show {hidden} more to do
          </Button>
        </div>
      )}
      {sorted.length === 0 && (
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
