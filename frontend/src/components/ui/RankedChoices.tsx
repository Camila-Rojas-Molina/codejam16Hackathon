// Pick up to N options and put them in order of importance. Order matters: the ranked list is
// saved as-is and matching weights each position (features/profile/matchingConfig.ts). The weights
// stay internal: people just see "1, 2, 3", with the top pick visibly emphasised.
//   * Tap a choice to add it to the bottom of the ranking (tap again, or ×, to remove it).
//   * Drag a row by its grip to reorder: pointer events, so mouse, touch and pen all work.
//   * Keyboard: focus a grip, Space/Enter to pick it up, ↑/↓ to move, Space/Enter to drop, Esc to
//     cancel. Alt+↑/↓ moves it straight away. Every move is announced.
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { Option } from '../../features/profile/options'
import { cn } from '../../lib/cn'
import Icon from '../icons/Icon'

type RankedChoicesProps<T extends string> = {
  legend: string
  /** Visually hide the legend when the screen heading already says it. Still read aloud. */
  hideLegend?: boolean
  options: Option<T>[]
  /** Ranked values, most important first. */
  values: readonly T[]
  onChange: (values: T[]) => void
  max: number
}

const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th', '5th', '6th'][n - 1] ?? `${n}th`

/** A pointer drag in progress: which item, and where in the row it was grabbed. */
type Drag<T> = { value: T; pointerId: number; grabY: number; y: number }

export default function RankedChoices<T extends string>({ legend, hideLegend, options, values, onChange, max }: RankedChoicesProps<T>) {
  const id = useId()
  const [announce, setAnnounce] = useState('')
  const [drag, setDrag] = useState<Drag<T> | null>(null)
  // Keyboard "lift": the item picked up with Space/Enter, and the order to restore on Esc.
  const [lifted, setLifted] = useState<{ value: T; original: T[] } | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const rowRefs = useRef(new Map<T, HTMLLIElement>())
  const gripRefs = useRef(new Map<T, HTMLButtonElement>())
  const refocus = useRef<T | null>(null)
  const label = (v: T) => options.find((o) => o.value === v)?.label ?? v
  const full = values.length >= max

  function say(text: string) {
    // Same text twice in a row wouldn't be re-read; a trailing space makes it new.
    setAnnounce((prev) => (prev === text ? `${text} ` : text))
  }

  function toggle(v: T) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v))
      say(`${label(v)} removed from your ranking.`)
    } else if (!full) {
      onChange([...values, v])
      say(`${label(v)} added at number ${values.length + 1}.`)
    }
  }

  function moveTo(v: T, to: number, announceIt = true) {
    const from = values.indexOf(v)
    if (from < 0 || to < 0 || to >= values.length || from === to) return
    const next = [...values]
    next.splice(from, 1)
    next.splice(to, 0, v)
    onChange(next)
    refocus.current = v
    if (announceIt) say(`${label(v)} moved to number ${to + 1} of ${next.length}.`)
  }

  // ---- Pointer drag ---------------------------------------------------------------------------
  // The grabbed row follows the pointer; the others reorder around it as its middle crosses theirs.

  function listTop() {
    const list = listRef.current
    return list ? list.getBoundingClientRect().top + list.clientTop : 0
  }

  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>, v: T) {
    if (e.button !== 0) return
    const target = e.target as Element
    if (target.closest('[data-remove]')) return
    // Touch and pen start from the handle only; elsewhere the finger scrolls the page.
    if (e.pointerType !== 'mouse' && !target.closest('[data-handle]')) return
    const row = e.currentTarget
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setLifted(null)
    setDrag({ value: v, pointerId: e.pointerId, grabY: e.clientY - row.getBoundingClientRect().top, y: e.clientY })
  }

  function onPointerMove(e: ReactPointerEvent<HTMLLIElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const row = rowRefs.current.get(drag.value)
    if (!row) return
    // Where the dragged row's middle is now, in list coordinates.
    const middle = e.clientY - listTop() - drag.grabY + row.offsetHeight / 2
    // Its new index: how many of the other rows have their middle above it.
    let to = 0
    for (const v of values) {
      if (v === drag.value) continue
      const other = rowRefs.current.get(v)
      if (other && other.offsetTop + other.offsetHeight / 2 < middle) to++
    }
    if (to !== values.indexOf(drag.value)) moveTo(drag.value, to, false)
    setDrag({ ...drag, y: e.clientY })
  }

  function endDrag(e: ReactPointerEvent<HTMLLIElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return
    say(`${label(drag.value)} is now number ${values.indexOf(drag.value) + 1} of ${values.length}.`)
    setDrag(null)
  }

  // Position the dragged row under the pointer before paint, so reorders never flash.
  useLayoutEffect(() => {
    for (const [v, row] of rowRefs.current) {
      if (drag && v === drag.value) {
        // Follow the pointer, but stay within the list.
        const max = (listRef.current?.clientHeight ?? 0) - row.offsetHeight
        const top = Math.min(Math.max(drag.y - listTop() - drag.grabY, 0), Math.max(max, 0))
        const offset = top - row.offsetTop
        row.style.transform = `translateY(${Math.round(offset)}px)`
      } else {
        row.style.transform = ''
      }
    }
  })

  // Keep keyboard focus on the grip that just moved (moving a DOM node can drop its focus).
  useLayoutEffect(() => {
    if (refocus.current === null) return
    const grip = gripRefs.current.get(refocus.current)
    refocus.current = null
    if (!drag && grip && document.activeElement !== grip) grip.focus()
  })

  // ---- Keyboard -------------------------------------------------------------------------------

  function onGripKeyDown(e: KeyboardEvent<HTMLButtonElement>, v: T) {
    const i = values.indexOf(v)
    const up = e.key === 'ArrowUp'
    const down = e.key === 'ArrowDown'
    if ((up || down) && (e.altKey || lifted?.value === v)) {
      e.preventDefault()
      moveTo(v, up ? i - 1 : i + 1)
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (lifted?.value === v) {
        setLifted(null)
        say(`${label(v)} dropped at number ${i + 1} of ${values.length}.`)
      } else {
        setLifted({ value: v, original: [...values] })
        say(`${label(v)} picked up, number ${i + 1} of ${values.length}. Use the up and down arrows to move it, Space to drop, Escape to cancel.`)
      }
      return
    }
    if (e.key === 'Escape' && lifted?.value === v) {
      e.preventDefault()
      onChange(lifted.original)
      refocus.current = v
      setLifted(null)
      say(`Cancelled. ${label(v)} is back at number ${lifted.original.indexOf(v) + 1}.`)
    }
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={hideLegend ? 'sr-only' : 'eyebrow mb-2'}>{legend}</legend>
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
                  <span className="grid size-6 shrink-0 place-items-center bg-ink text-xs leading-none font-bold text-saffron tabular-nums" aria-hidden>
                    {rank + 1}
                  </span>
                ) : (
                  o.icon && <Icon name={o.icon} className="size-6" />
                )}
                {o.label}
                {on && <span className="sr-only">, ranked {rank + 1}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm font-semibold">
          {values.length} of {max} picked
        </p>
      </fieldset>

      {values.length > 0 && (
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5" id={`${id}-order`}>
            Your ranking
            {values.length > 1 && (
              <span className="inline-flex items-center gap-1 font-semibold tracking-normal normal-case" aria-hidden>
                · drag <Icon name="grip" accent="none" className="size-4" /> to reorder
              </span>
            )}
          </p>
          <ol ref={listRef} aria-labelledby={`${id}-order`} aria-describedby={`${id}-kbd`} className="relative space-y-2">
            {values.map((v, i) => {
              const o = options.find((x) => x.value === v)
              const top = i === 0
              const dragging = drag?.value === v
              const isLifted = lifted?.value === v
              return (
                <li
                  key={v}
                  ref={(el) => {
                    if (el) rowRefs.current.set(v, el)
                    else rowRefs.current.delete(v)
                  }}
                  onPointerDown={(e) => onPointerDown(e, v)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={cn(
                    'relative flex items-stretch border-2 border-ink',
                    top ? 'min-h-16 bg-saffron' : 'min-h-14 sheet-grain',
                    dragging ? 'z-10 shadow-block' : 'transition-[background-color,box-shadow] duration-150',
                    isLifted && 'shadow-block-sm outline-3 outline-offset-2 outline-ink',
                  )}
                >
                  {/* The handle: grip + number. Touch drags start here only, so swiping over the
                      rest of the list still scrolls the page. A mouse can grab the whole row. */}
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) gripRefs.current.set(v, el)
                      else gripRefs.current.delete(v)
                    }}
                    data-handle
                    aria-label={`${label(v)}, ${ordinal(i + 1)} of ${values.length}. Reorder`}
                    aria-describedby={`${id}-kbd`}
                    aria-pressed={isLifted}
                    title="Drag to reorder"
                    onKeyDown={(e) => onGripKeyDown(e, v)}
                    onBlur={() => isLifted && refocus.current !== v && setLifted(null)}
                    className={cn('flex shrink-0 touch-none items-center gap-2 py-2 pr-1 pl-2 focus-visible:-outline-offset-4', dragging ? 'cursor-grabbing' : 'cursor-grab')}
                  >
                    <Icon name="grip" accent="none" className="size-5 shrink-0 opacity-70" />
                    <span
                      className={cn(
                        'grid shrink-0 place-items-center border-2 border-ink font-display leading-none tabular-nums',
                        top ? 'size-11 bg-ink text-2xl text-saffron' : 'size-9 bg-sheet text-lg',
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                  </button>
                  <span className={cn('flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-2 select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')} aria-hidden>
                    {o?.icon && <Icon name={o.icon} accent={top ? 'sheet' : 'saffron'} className="size-7 max-[359px]:hidden" />}
                    <span className="min-w-0">
                      <span className={cn('block leading-tight font-bold', top && 'text-lg')}>{label(v)}</span>
                      {top && <span className="eyebrow mt-0.5 block">Top pick</span>}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-remove
                    className="grid w-11 shrink-0 place-items-center transition-colors hover:bg-ink hover:text-sheet"
                    onClick={() => toggle(v)}
                    aria-label={`Remove ${label(v)}`}
                  >
                    <Icon name="close" accent="none" strokeWidth={2.2} className="size-4" />
                  </button>
                </li>
              )
            })}
          </ol>
          <p id={`${id}-kbd`} className="sr-only">
            Space to pick up, arrow keys to move, Space to drop. Or Alt plus arrow keys.
          </p>
        </div>
      )}
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
    </div>
  )
}
