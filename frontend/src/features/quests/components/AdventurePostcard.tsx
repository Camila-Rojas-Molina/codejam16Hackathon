// TRAVEL ADVENTURES: personalised suggestions as teal postcards: the idea and why it was picked on
// the left, the stamp (reward), postmark (place) and "address lines" (what's checked) on the right.
import Icon from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'
import type { QuestDef } from '../../economy/types'
import type { QuestPerson } from '../engine'
import { whySuggested, type QuestView } from '../view'
import { CompanyBadge, QuestActions, ViewProgress } from './QuestCard'

const EFFORT_LABEL: Record<NonNullable<QuestDef['effort']>, string> = { light: 'Easy-going', moderate: 'A good outing', big: 'A big day' }

export default function AdventurePostcard({
  view,
  person,
  city,
  highlight = false,
}: {
  view: QuestView
  person: Pick<QuestPerson, 'interests' | 'mode' | 'pace'>
  city: string | null
  highlight?: boolean
}) {
  const { a, def, state } = view
  return (
    <article
      id={`quest-${a.id}`}
      aria-labelledby={`quest-${a.id}-title`}
      className={cn(
        'relative flex scroll-mt-24 flex-col border-2 border-ink',
        state === 'claimed' ? 'bg-sheet' : 'bg-teal-soft',
        highlight && 'shadow-block outline-4 outline-offset-4 outline-saffron',
      )}
    >
      {/* Top strip: postmark (place) and the stamp (reward). */}
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div className="min-w-0 space-y-2">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon name="sparkle" accent="saffron" className="size-4" />
            {whySuggested(def, person, city)}
          </p>
          <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-dashed border-ink px-3 py-0.5 text-xs font-bold">
            <Icon name="pin" accent="sienna" className="size-4 shrink-0" />
            <span className="truncate">{city ?? 'Wherever you are'}</span>
          </p>
        </div>
        <div className="grid w-20 shrink-0 rotate-2 place-items-center border-2 border-dashed border-ink bg-sheet p-1.5 text-center shadow-block-sm" aria-label={`${a.reward} points`}>
          <Icon name={view.icon} className="size-8" />
          <span className="font-display text-lg leading-none tabular-nums">+{a.reward}</span>
          <span className="text-[0.6rem] font-bold tracking-[0.12em] uppercase">points</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 id={`quest-${a.id}-title`} className="text-2xl leading-tight break-words">
          {view.title}
        </h3>
        <p className="font-serif text-lg leading-snug">{view.description}</p>
        <hr className="rule-dashed" />
        <ul className="space-y-1 text-sm">
          <li className="flex items-start gap-2 font-bold">
            <Icon name="flag" accent="sienna" className="mt-0.5 size-4 shrink-0" />
            {view.objective}
          </li>
          {def?.effort && (
            <li className="flex items-center gap-2">
              <Icon name="shoe" accent="none" className="size-4 shrink-0" />
              {EFFORT_LABEL[def.effort]}
            </li>
          )}
        </ul>
        <div className="flex flex-wrap gap-2">
          <CompanyBadge company={def?.company} />
          {state === 'claimed' && <Badge tone="teal" icon="check">Completed</Badge>}
        </div>
        <ViewProgress view={view} fill="bg-teal" />
        <QuestActions view={view} goTone="sheet" compact className="mt-auto" />
      </div>
    </article>
  )
}
