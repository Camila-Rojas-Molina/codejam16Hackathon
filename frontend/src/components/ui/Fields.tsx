// Form fields in the MIGO style: paper fill, thick navy outline, typewriter labels.
import { useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const fieldLabel = 'mb-2 block font-type text-sm tracking-wider uppercase'
const inputBase =
  'w-full border-[3px] border-navy bg-paper text-navy placeholder:text-navy/60 ' +
  'aria-invalid:border-red aria-invalid:border-dashed'

function Hint({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 text-sm">
      {children}
    </p>
  )
}

function ErrorText({ id, children }: { id: string; children?: ReactNode }) {
  // Navy on a sun chip, so the error reads clearly on any background (13.9:1 ink on sun).
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-2 inline-block rounded-lg border-2 border-navy bg-sun px-2 py-0.5 text-sm text-ink">
      {children}
    </p>
  )
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: string | null
  optional?: boolean
}

export function TextField({ label, value, onChange, hint, error, optional, className, ...rest }: TextFieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
        {optional && <span className="ml-2 normal-case opacity-80">(optional)</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputBase, 'min-h-14 rounded-full px-5 text-lg')}
        {...rest}
      />
      <Hint id={`${id}-hint`}>{hint}</Hint>
      <ErrorText id={`${id}-err`}>{error}</ErrorText>
    </div>
  )
}

type TextAreaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  placeholder?: string
  hint?: ReactNode
  optional?: boolean
  rows?: number
  className?: string
}

export function TextArea({ label, value, onChange, maxLength, placeholder, hint, optional, rows = 3, className }: TextAreaProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
        {optional && <span className="ml-2 normal-case opacity-80">(optional)</span>}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(inputBase, 'rounded-[1.3rem_1.1rem_1.4rem_1rem] px-4 py-3 text-base')}
      />
      <div className="flex justify-between gap-3">
        <Hint id={`${id}-hint`}>{hint}</Hint>
        <span className="mt-1.5 ml-auto shrink-0 font-type text-xs" aria-hidden>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}

type ToggleProps = {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

/** On/off switch. A real checkbox with role="switch" so it's announced as on/off. */
export function Toggle({ label, description, checked, onChange, className }: ToggleProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          'relative mt-0.5 inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-[3px] border-navy transition-colors',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-navy',
          checked ? 'bg-navy' : 'bg-paper',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute size-5 rounded-full border-2 border-navy transition-transform duration-200 ease-spring',
            checked ? 'translate-x-7 bg-sun' : 'translate-x-1 bg-bubble-light',
          )}
        />
      </label>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-semibold">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-sm">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

type StepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit: (n: number) => string
}

export function Stepper({ label, value, onChange, min, max, unit }: StepperProps) {
  const id = useId()
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)))
  const btn =
    'grid size-12 place-items-center rounded-full border-[3px] border-navy bg-paper font-type text-2xl text-navy transition-transform active:scale-90 disabled:opacity-40'
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={fieldLabel}>
        {label}
      </p>
      <div className="flex items-center gap-4">
        <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label="One fewer">
          −
        </button>
        <output aria-live="polite" className="min-w-28 text-center font-display text-3xl">
          {value} <span className="font-sans text-base normal-case">{unit(value)}</span>
        </output>
        <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label="One more">
          +
        </button>
      </div>
    </div>
  )
}

type TagInputProps = {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  maxLength: number
  max: number
  hint?: ReactNode
  addLabel?: string
}

/** Free-text tags: type and press Enter (or Add). Duplicates are ignored, case-insensitively. */
export function TagInput({ label, values, onChange, placeholder, maxLength, max, hint, addLabel = 'Add' }: TagInputProps) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const full = values.length >= max

  function add() {
    const v = draft.trim().replace(/\s+/g, ' ')
    if (!v || full) return
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      // Don't submit the step form; add the tag instead.
      e.preventDefault()
      add()
    }
  }

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={maxLength}
          placeholder={full ? `That’s ${max}, nice!` : placeholder}
          disabled={full}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(inputBase, 'min-h-12 min-w-0 flex-1 rounded-full px-4 disabled:opacity-60')}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || full}
          className="min-h-12 shrink-0 rounded-full border-[3px] border-navy bg-bubble px-4 font-type text-sm tracking-wider text-navy uppercase transition-transform active:scale-95 disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>
      <Hint id={`${id}-hint`}>{hint}</Hint>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label}: added`}>
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-[3px] border-navy bg-sun px-4 text-sm font-medium text-ink transition-transform active:scale-95"
                aria-label={`Remove ${v}`}
              >
                {v}
                <span aria-hidden className="font-type">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
