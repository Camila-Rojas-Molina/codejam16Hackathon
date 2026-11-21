// A paper card of answers, each tagged Public or Private, with optional Change buttons.
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'

export type Visibility = 'public' | 'private'

export type SummaryItem = {
  id: string
  label: string
  value: string
  visibility: Visibility
}

export function VisibilityTag({ visibility }: { visibility: Visibility }) {
  return visibility === 'public' ? (
    <Badge tone="bubble" className="shrink-0">
      <span aria-hidden>👀</span> Public
    </Badge>
  ) : (
    <Badge tone="navy" className="shrink-0">
      <span aria-hidden>🔒</span> Private
    </Badge>
  )
}

type SummaryListProps = {
  title: string
  items: SummaryItem[]
  onEdit?: (id: string) => void
  tilt?: 'left' | 'right' | 'none'
  className?: string
}

export default function SummaryList({ title, items, onEdit, tilt = 'none', className }: SummaryListProps) {
  return (
    <section
      className={cn(
        'rounded-[1.6rem_1.4rem_1.7rem_1.3rem] border-[3px] border-navy bg-paper text-navy',
        tilt === 'left' && '-rotate-[0.5deg]',
        tilt === 'right' && 'rotate-[0.5deg]',
        className,
      )}
    >
      <h2 className="border-b-[3px] border-navy px-5 pt-4 pb-3 text-2xl">{title}</h2>
      <dl className="divide-y-2 divide-dashed divide-navy/40">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <dt className="flex flex-wrap items-center gap-2 font-type text-xs tracking-wider uppercase">
                {item.label}
                <VisibilityTag visibility={item.visibility} />
              </dt>
              <dd className="mt-1 break-words">{item.value}</dd>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item.id)}
                className="min-h-11 shrink-0 rounded-full border-[3px] border-navy bg-bubble-light px-3 font-type text-xs tracking-wider uppercase transition-transform active:scale-95"
                aria-label={`Change ${item.label}`}
              >
                Change
              </button>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
