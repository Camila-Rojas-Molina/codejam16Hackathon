// A ruled table of answers, each tagged Public or Private, with optional Change buttons.
// Square cells throughout: profile boxes are always straight-edged. One column on phones; two
// columns once the list itself is wide enough (a container query, so it works in any layout).
import Icon, { type IconName } from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'

export type Visibility = 'public' | 'private'

export type SummaryItem = {
  id: string
  label: string
  value: string
  visibility: Visibility
  icon?: IconName
}

export function VisibilityTag({ visibility }: { visibility: Visibility }) {
  return visibility === 'public' ? (
    <Badge tone="teal" icon="eye" className="shrink-0">
      Public
    </Badge>
  ) : (
    <Badge tone="ink" icon="lock" className="shrink-0">
      Private
    </Badge>
  )
}

type SummaryListProps = {
  title: string
  items: SummaryItem[]
  onEdit?: (id: string) => void
  /** Solid offset shadow. */
  lifted?: boolean
  className?: string
}

export default function SummaryList({ title, items, onEdit, lifted = false, className }: SummaryListProps) {
  return (
    <section className={cn('sheet-grain @container border-2 border-ink text-ink', lifted && 'shadow-block', className)}>
      <h2 className="bg-saffron px-5 pt-4 pb-3 text-2xl">{title}</h2>
      <div className="hatch-band" aria-hidden />
      <dl className="grid @2xl:grid-cols-2">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              'flex items-stretch border-ink',
              i > 0 && 'border-t-2',
              i === 1 && '@2xl:border-t-0',
              i % 2 === 1 && '@2xl:border-l-2',
              i === items.length - 1 && i % 2 === 0 && '@2xl:col-span-2',
            )}
          >
            {item.icon && (
              <span className="hidden w-14 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft sm:grid @2xl:w-11" aria-hidden>
                <Icon name={item.icon} className="size-7" />
              </span>
            )}
            <div className="min-w-0 flex-1 px-4 py-3">
              <dt className="flex flex-wrap items-center gap-2 eyebrow">
                {item.label}
                <VisibilityTag visibility={item.visibility} />
              </dt>
              <dd className="mt-1 font-semibold break-words">{item.value}</dd>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item.id)}
                className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-ink text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron sm:w-24 sm:flex-row @2xl:w-20 @2xl:flex-col"
                aria-label={`Change ${item.label}`}
              >
                <Icon name="pencil" className="size-4" />
                Change
              </button>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
