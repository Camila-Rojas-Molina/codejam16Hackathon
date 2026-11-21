// Selection cards and chips for the questionnaire. Real radio/checkbox inputs under the hood, so
// keyboard (Tab, arrows, Space) and screen readers work for free; the visuals are styled labels.
import { useId } from 'react'
import type { Option } from '../../features/profile/options'
import { cn } from '../../lib/cn'

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

const gridCols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

// Selected = sun fill + ✓ stamp (never colour alone). Focus ring follows the hidden input.
const cardBase =
  'relative flex cursor-pointer select-none border-[3px] border-navy bg-paper text-navy ' +
  'transition-[transform,background-color] duration-150 active:scale-[0.97] hover:bg-bubble-light ' +
  'has-checked:bg-sun has-checked:text-ink has-checked:hover:bg-sun ' +
  'has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-navy ' +
  'has-disabled:cursor-not-allowed has-disabled:opacity-45 has-disabled:hover:bg-paper has-disabled:active:scale-100'

const layouts: Record<ChoiceLayout, string> = {
  row: 'min-h-16 items-center gap-3 rounded-[1.3rem_1.1rem_1.4rem_1rem] px-4 py-3 text-left',
  tile: 'min-h-28 flex-col items-center justify-center gap-1.5 rounded-[1.4rem_1.2rem_1.5rem_1.1rem] p-3 text-center',
  chip: 'min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium',
}

function Check({ layout }: { layout: ChoiceLayout }) {
  if (layout === 'chip') {
    return (
      <span className="hidden font-type text-xs group-has-checked:inline" aria-hidden>
        ✓
      </span>
    )
  }
  return (
    <span
      className={cn(
        'absolute grid size-6 scale-0 place-items-center rounded-full border-2 border-navy bg-navy text-xs text-white transition-transform duration-200 ease-spring group-has-checked:scale-100',
        layout === 'row' ? 'top-1/2 right-3 -translate-y-1/2' : '-top-2 -right-2',
      )}
      aria-hidden
    >
      ✓
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
      <legend className={cn(hideLegend ? 'sr-only' : 'mb-2 font-type text-sm tracking-wider uppercase')}>{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-3 text-sm">
          {hint}
        </p>
      )}
      <div className={layout === 'chip' ? 'flex flex-wrap gap-2' : cn('grid gap-3', gridCols[columns])}>
        {options.map((option) => {
          const checked = isChecked(option.value)
          return (
            <label key={option.value} className={cn('group', cardBase, layouts[layout], layout === 'row' && 'pr-12')}>
              <input
                type={props.multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={checked}
                disabled={!checked && atMax}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              {option.emoji && (
                <span className={cn('shrink-0 leading-none', layout === 'chip' ? 'text-lg' : 'text-3xl')} aria-hidden>
                  {option.emoji}
                </span>
              )}
              <span className="min-w-0">
                <span className={cn('block', layout === 'chip' ? '' : 'font-semibold leading-tight', layout === 'tile' && 'text-sm')}>
                  {option.label}
                </span>
                {option.blurb && layout !== 'chip' && <span className="mt-0.5 block text-sm leading-snug">{option.blurb}</span>}
              </span>
              <Check layout={layout} />
            </label>
          )
        })}
      </div>
      {props.multiple && props.max !== undefined && (
        <p className="mt-2 text-sm" aria-live="polite">
          {props.values.length} of {props.max} picked
        </p>
      )}
    </fieldset>
  )
}
