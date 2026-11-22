// Completed quests, newest first: a ruled list of date, category, title and points earned.
import { useState } from 'react'
import Icon from '../../../components/icons/Icon'
import Badge, { type BadgeTone } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import type { QuestCategory } from '../../economy/types'
import type { QuestView } from '../view'

const CATEGORY: Record<QuestCategory, { label: string; tone: BadgeTone }> = {
  weekly: { label: 'Weekly', tone: 'saffron' },
  daily: { label: 'Daily', tone: 'sandy' },
  adventure: { label: 'Adventure', tone: 'teal' },
  starter: { label: 'Starter', tone: 'outline' },
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const SHOWN = 8

export default function QuestHistory({ items }: { items: QuestView[] }) {
  const [all, setAll] = useState(false)
  if (items.length === 0) {
    return (
      <p className="sheet-grain flex items-center gap-2 border-2 border-ink p-4 text-sm">
        <Icon name="book" className="size-6" />
        Quests you complete will be listed here.
      </p>
    )
  }
  const shown = all ? items : items.slice(0, SHOWN)
  return (
    <div className="sheet-grain border-2 border-ink shadow-block-sm">
      <ul>
        {shown.map((v) => {
          const c = CATEGORY[v.a.category]
          const at = v.a.completedAt ? new Date(v.a.completedAt) : null
          return (
            <li key={v.a.id} className="flex items-center gap-3 border-b-2 border-ink px-4 py-3 last:border-b-0">
              <Icon name={v.icon} className="size-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{v.title}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={c.tone}>{c.label}</Badge>
                  {at && <time dateTime={v.a.completedAt ?? undefined}>{dateFmt.format(at)}</time>}
                </p>
              </div>
              <span className="shrink-0 font-display text-lg tabular-nums">+{v.a.reward}</span>
            </li>
          )
        })}
      </ul>
      {items.length > SHOWN && (
        <div className="border-t-2 border-ink p-2">
          <Button variant="ghost" size="sm" fullWidth onClick={() => setAll((x) => !x)} className="min-h-11">
            {all ? 'Show fewer' : `Show all ${items.length}`}
          </Button>
        </div>
      )}
    </div>
  )
}
