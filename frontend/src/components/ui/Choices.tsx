// Selection cells for the questionnaire and setups. Real radio/checkbox inputs under the hood, so
// keyboard (Tab, arrows, Space) and screen readers work for free; the visuals are a ruled grid of
// cells, like a printed menu, with selected cells filled saffron and ticked.
import { useId } from 'react'
import type { Option } from '../../features/profile/options'
import { cn } from '../../lib/cn'
import Icon from '../icons/Icon'

export type ChoiceLayout = 'row' | 'tile' | 'chip'

type Common<T extends string> = {
  legend: string
  /** Visually hide the legend when the screen heading already says it. Still read aloud. */
  hideLegend?: boolean
  hint?: string
  options: Option<T>[]
  layout?: ChoiceLayout
  columns?: 1 | 2 | 3
  className?: string
}

type SingleProps<T extends string> = Common<T> & {
  multiple?: false
  value: T | null
  onChange: (value: T) => void
}

type MultiProps<T extends string> = Common<T> & {
  multiple: true
  values: readonly T[]
  onChange: (values: T[]) => void
  /** Most options that can be picked at once. */
  max?: number
}

export type ChoicesProps<T extends string> = SingleProps<T> | MultiProps<T>

const gridCols = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3' }

// Cells share their rules: the grid draws the top/left edge, each cell its right/bottom edge.
const cellBase =
  'relative flex cursor-pointer select-none text-ink transition-colors duration-150 sheet-grain ' +
  'hover:bg-saffron-soft has-checked:bg-saffron has-checked:hover:bg-saffron ' +
  'has-focus-visible:outline-3 has-focus-visible:-outline-offset-[6px] has-focus-visible:outline-ink ' +
  'has-disabled:cursor-not-allowed has-disabled:opacity-45 has-disabled:hover:bg-sheet'

const layouts: Record<ChoiceLayout, string> = {
  row: 'min-h-16 items-center gap-4 border-r-2 border-b-2 border-ink px-4 py-3 pr-14 text-left',
  tile: 'min-h-28 flex-col items-center justify-center gap-2 border-r-2 border-b-2 border-ink px-3 pt-4 pb-3 text-center',
  chip: 'min-h-11 items-center gap-2 border-2 border-ink px-3 py-2 text-sm',
}

/**
 * A tick drawn so its bounding box sits exactly in the middle of a 24-unit grid (x 5–19, y 7–17),
 * so it centres in any square or round box. Use it for every "selected" badge.
 */
export function CheckMark({ className, strokeWidth = 3 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('block shrink-0', className)}
      aria-hidden
      focusable="false"
    >
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  )
}

// Box and tick sizes per layout: the tick's SVG is about the size of the box's inside (the stroke
// itself spans ~60% of it), so it reads clearly without touching the rule.
const tickBox: Record<ChoiceLayout, string> = {
  row: 'absolute top-1/2 right-4 size-7 -translate-y-1/2',
  tile: 'absolute top-2 right-2 size-6',
  chip: 'size-5',
}
const tickMark: Record<ChoiceLayout, string> = { row: 'size-5.5', tile: 'size-5', chip: 'size-4' }

/** The tick box: an empty ruled square (round for single choice) that fills ink with a saffron tick. */
function Tick({ multiple, layout }: { multiple: boolean; layout: ChoiceLayout }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center border-2 border-ink bg-sheet text-saffron transition-colors group-has-checked:bg-ink',
        tickBox[layout],
        !multiple && 'rounded-full',
      )}
    >
      <CheckMark strokeWidth={3.2} className={cn(tickMark[layout], 'scale-0 transition-transform duration-200 ease-spring group-has-checked:scale-100')} />
    </span>
  )
}

export default function Choices<T extends string>(props: ChoicesProps<T>) {
  const { legend, hideLegend, hint, options, layout = 'row', columns = 1, className } = props
  const name = useId()
  const hintId = `${name}-hint`

  const isChecked = (v: T) => (props.multiple ? props.values.includes(v) : props.value === v)
  const atMax = props.multiple && props.max !== undefined && props.values.length >= props.max

  function toggle(option: Option<T>) {
    if (!props.multiple) return props.onChange(option.value)
    const { values } = props
    if (values.includes(option.value)) return props.onChange(values.filter((v) => v !== option.value))
    if (option.exclusive) return props.onChange([option.value])
    const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value))
    props.onChange([...values.filter((v) => !exclusive.has(v)), option.value])
  }

  return (
    <fieldset className={className} aria-describedby={hint ? hintId : undefined}>
      <legend className={cn(hideLegend ? 'sr-only' : 'eyebrow mb-2')}>{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-3 text-sm">
          {hint}
        </p>
      )}
      <div className={layout === 'chip' ? 'flex flex-wrap gap-2' : cn('grid border-t-2 border-l-2 border-ink', gridCols[columns])}>
        {options.map((option) => {
          const checked = isChecked(option.value)
          return (
            <label key={option.value} className={cn('group', cellBase, layouts[layout])}>
              <input
                type={props.multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={checked}
                disabled={!checked && atMax}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              {layout === 'chip' && <Tick multiple={!!props.multiple} layout={layout} />}
              {option.icon && (
                <span
                  className={cn(
                    'grid shrink-0 place-items-center',
                    layout === 'row' && 'size-11 border-2 border-ink bg-sheet group-has-checked:bg-sheet',
                    layout === 'tile' && 'size-12',
                  )}
                  style={option.iconScale ? { transform: `scale(${option.iconScale})` } : undefined}
                  aria-hidden
                >
                  <Icon
                    name={option.icon}
                    className={cn(layout === 'chip' ? 'size-5' : layout === 'tile' ? 'size-9' : 'size-7')}
                    accent={layout === 'tile' && checked ? 'sheet' : 'saffron'}
                  />
                </span>
              )}
              <span className="min-w-0">
                <span className={cn('block', layout === 'chip' ? 'font-semibold' : 'font-bold leading-tight', layout === 'tile' && 'text-sm')}>
                  {option.label}
                </span>
                {option.blurb && layout !== 'chip' && <span className="mt-0.5 block text-sm leading-snug font-medium">{option.blurb}</span>}
              </span>
              {layout !== 'chip' && <Tick multiple={!!props.multiple} layout={layout} />}
            </label>
          )
        })}
      </div>
      {props.multiple && props.max !== undefined && (
        <p className="mt-2 text-sm font-semibold" aria-live="polite">
          {props.values.length} of {props.max} picked
        </p>
      )}
    </fieldset>
  )
}
