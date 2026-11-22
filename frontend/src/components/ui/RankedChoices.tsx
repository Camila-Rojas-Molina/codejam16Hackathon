// Pick up to N options and put them in order of importance. Order matters: the ranked list is
// saved as-is and matching weights each position (features/profile/matchingConfig.ts).
//   * Tap a choice to add it to the bottom of the ranking (or tap again to remove it).
//   * Drag the grip to reorder (pointer events: mouse, touch and pen).
//   * Or use the up / down buttons, which also work from the keyboard. Moves are announced.
import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Option } from '../../features/profile/options'
import { cn } from '../../lib/cn'
import Icon from '../icons/Icon'

type RankedChoicesProps<T extends string> = {
  legend: string
  options: Option<T>[]
  /** Ranked values, most important first. */
  values: readonly T[]
  onChange: (values: T[]) => void
  max: number
  /** Relative weight of each position (first = 1), shown so people see the top pick matters most. */
  weights?: readonly number[]
}

const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th', '5th', '6th'][n - 1] ?? `${n}th`

export default function RankedChoices<T extends string>({ legend, options, values, onChange, max, weights }: RankedChoicesProps<T>) {
  const id = useId()
  const [announce, setAnnounce] = useState('')
  const [dragging, setDragging] = useState<T | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const label = (v: T) => options.find((o) => o.value === v)?.label ?? v
  const full = values.length >= max

  function toggle(v: T) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v))
      setAnnounce(`${label(v)} removed from your ranking.`)
    } else if (!full) {
      onChange([...values, v])
      setAnnounce(`${label(v)} added at position ${values.length + 1} of ${values.length + 1}.`)
    }
  }

  function move(from: number, to: number, say = true) {
    if (to < 0 || to >= values.length || from === to) return
    const next = [...values]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    if (say) setAnnounce(`${label(item)} moved to position ${to + 1} of ${next.length}.`)
  }

  // Pointer drag: while dragging, swap with whichever row the pointer is over.
  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, v: T) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(v)
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || !listRef.current) return
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('[data-rank-row]')]
    const from = values.indexOf(dragging)
    const to = rows.findIndex((row) => {
      const r = row.getBoundingClientRect()
      return e.clientY >= r.top && e.clientY <= r.bottom
    })
    if (to >= 0 && to !== from) move(from, to, false)
  }
  function onPointerUp() {
    if (dragging) setAnnounce(`${label(dragging)} is now number ${values.indexOf(dragging) + 1} of ${values.length}.`)
    setDragging(null)
  }

  const iconBtn =
    'grid min-h-11 w-11 place-items-center border-l-2 border-ink transition-colors hover:bg-saffron disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="space-y-6">
      <fieldset aria-describedby={`${id}-hint`}>
        <legend className="eyebrow mb-2">{legend}</legend>
        <p id={`${id}-hint`} className="-mt-1 mb-3 text-sm">
          Tap up to {max}. Then put them in order: your <strong>first choice counts the most</strong> when we match you.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const rank = values.indexOf(o.value)
            const on = rank >= 0
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => toggle(o.value)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 border-2 border-ink px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                  on ? 'bg-saffron' : 'sheet-grain hover:bg-saffron-soft',
                )}
              >
                {on ? (
                  <span className="grid size-5 place-items-center bg-ink text-[0.65rem] font-bold text-saffron" aria-hidden>
                    {rank + 1}
                  </span>
                ) : (
                  o.icon && <Icon name={o.icon} className="size-5" />
                )}
                {o.label}
                {on && <span className="sr-only">, ranked {rank + 1}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm font-semibold" aria-live="polite">
          {values.length} of {max} picked
        </p>
      </fieldset>

      {values.length > 0 && (
        <div>
          <p className="eyebrow mb-2" id={`${id}-order`}>
            Your order of importance
          </p>
          <ol ref={listRef} aria-labelledby={`${id}-order`} className="border-t-2 border-l-2 border-ink">
            {values.map((v, i) => {
              const o = options.find((x) => x.value === v)
              const w = weights?.[Math.min(i, weights.length - 1)]
              return (
                <li
                  key={v}
                  data-rank-row
                  className={cn(
                    'flex items-stretch border-r-2 border-b-2 border-ink transition-colors',
                    i === 0 ? 'bg-saffron' : 'sheet-grain',
                    dragging === v && 'relative z-10 shadow-block-sm',
                  )}
                >
                  <button
                    type="button"
                    aria-label={`Drag to reorder ${label(v)}`}
                    title="Drag to reorder"
                    onPointerDown={(e) => onPointerDown(e, v)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className={cn('grid w-10 shrink-0 touch-none place-items-center border-r-2 border-ink', dragging === v ? 'cursor-grabbing' : 'cursor-grab')}
                  >
                    <Icon name="grip" accent="none" className="size-5" />
                  </button>
                  <span className={cn('grid w-14 shrink-0 place-items-center border-r-2 border-ink font-display leading-none', i === 0 ? 'text-3xl' : 'text-2xl')} aria-hidden>
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
                    {o?.icon && <Icon name={o.icon} accent={i === 0 ? 'sheet' : 'saffron'} className="hidden size-7 sm:block" />}
                    <div className="min-w-0">
                      <p className="font-bold">
                        <span className="sr-only">{ordinal(i + 1)}: </span>
                        {label(v)}
                      </p>
                      <p className="text-xs font-semibold">
                        {i === 0 ? 'Most important' : w !== undefined ? `Counts ${Math.round(w * 100)}% as much as your first` : ordinal(i + 1)}
                      </p>
                      {w !== undefined && (
                        <span className="mt-1 block h-1.5 w-full max-w-40 border border-ink bg-sheet" aria-hidden>
                          <span className="block h-full bg-ink" style={{ width: `${w * 100}%` }} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className={iconBtn} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${label(v)} up`}>
                      <Icon name="arrow-up" accent="none" strokeWidth={2.2} className="size-4" />
                    </button>
                    <button type="button" className={iconBtn} onClick={() => move(i, i + 1)} disabled={i === values.length - 1} aria-label={`Move ${label(v)} down`}>
                      <Icon name="arrow-down" accent="none" strokeWidth={2.2} className="size-4" />
                    </button>
                    <button type="button" className={iconBtn} onClick={() => toggle(v)} aria-label={`Remove ${label(v)}`}>
                      <Icon name="close" accent="none" strokeWidth={2.2} className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
    </div>
  )
}
