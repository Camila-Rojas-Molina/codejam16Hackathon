// Form fields in the MIGO print style: square ruled boxes on paper, small-caps labels, and plain
// Montserrat for whatever you type (the most legible face in the system).
import { useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Icon from '../icons/Icon'

export const fieldLabel = 'eyebrow mb-2 block'
export const inputBase =
  'w-full border-2 border-ink sheet-grain text-ink placeholder:text-ink/55 transition-shadow ' +
  'focus:shadow-block-sm focus:outline-none focus-visible:outline-none ' +
  'aria-invalid:border-sienna-deep aria-invalid:border-dashed'

function Hint({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 text-sm">
      {children}
    </p>
  )
}

/** Inline error: sienna rule, soft tint, alert icon, ink text (7.3:1). */
export function ErrorText({ id, children, className }: { id?: string; children?: ReactNode; className?: string }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className={cn('mt-2 flex items-start gap-2 border-2 border-sienna-deep bg-sienna-soft px-3 py-1.5 text-sm font-semibold text-ink', className)}>
      <Icon name="alert" accent="sienna" className="mt-px size-5" />
      <span>{children}</span>
    </p>
  )
}

function Optional() {
  return <span className="ml-2 font-medium tracking-normal normal-case">(optional)</span>
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
        {optional && <Optional />}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputBase, 'min-h-14 px-4 text-lg')}
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
        {optional && <Optional />}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(inputBase, 'px-4 py-3 text-base')}
      />
      <div className="flex justify-between gap-3">
        <Hint id={`${id}-hint`}>{hint}</Hint>
        <span className="mt-1.5 ml-auto shrink-0 text-xs font-semibold tabular-nums" aria-hidden>
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

/** On/off switch: a real checkbox with role="switch", drawn as a ruled slider with a square knob. */
export function Toggle({ label, description, checked, onChange, className }: ToggleProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-4', className)}>
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
          'relative mt-0.5 inline-flex h-8 w-15 shrink-0 cursor-pointer items-center border-2 border-ink transition-colors',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ink',
          checked ? 'bg-teal' : 'bg-sheet',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute grid size-6 place-items-center border-2 border-ink transition-transform duration-200 ease-spring',
            checked ? 'translate-x-7 bg-saffron' : 'translate-x-0.5 bg-paper',
          )}
        >
          {checked && <Icon name="check" accent="none" strokeWidth={3} className="size-4" />}
        </span>
      </label>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-bold">
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
  const btn = 'grid size-12 place-items-center border-2 border-ink bg-saffron text-ink transition-colors hover:bg-ink hover:text-saffron disabled:opacity-40 disabled:hover:bg-saffron disabled:hover:text-ink'
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={fieldLabel}>
        {label}
      </p>
      <div className="inline-flex items-stretch border-2 border-ink">
        <button type="button" className={cn(btn, 'border-0 border-r-2')} onClick={() => set(value - 1)} disabled={value <= min} aria-label="One fewer">
          <Icon name="minus" accent="none" strokeWidth={2.6} className="size-5" />
        </button>
        <output aria-live="polite" className="sheet-grain flex min-w-32 items-center justify-center gap-2 px-3">
          <span className="font-display text-3xl leading-none">{value}</span>
          <span className="text-sm font-semibold">{unit(value)}</span>
        </output>
        <button type="button" className={cn(btn, 'border-0 border-l-2')} onClick={() => set(value + 1)} disabled={value >= max} aria-label="One more">
          <Icon name="plus" accent="none" strokeWidth={2.6} className="size-5" />
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
      <div className="flex">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={maxLength}
          placeholder={full ? `That’s ${max}, nice!` : placeholder}
          disabled={full}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(inputBase, 'min-h-12 min-w-0 flex-1 px-4 disabled:opacity-60')}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || full}
          className="-ml-[2px] inline-flex min-h-12 shrink-0 items-center gap-1 border-2 border-ink bg-saffron px-4 text-sm font-bold tracking-[0.08em] text-ink uppercase transition-colors hover:bg-ink hover:text-saffron disabled:opacity-50 disabled:hover:bg-saffron disabled:hover:text-ink"
        >
          <Icon name="plus" accent="none" strokeWidth={2.4} className="size-4" />
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
                className="inline-flex min-h-10 items-center gap-2 border-2 border-ink bg-saffron-soft pr-2 pl-3 text-sm font-semibold text-ink transition-colors hover:bg-sienna-soft"
                aria-label={`Remove ${v}`}
              >
                {v}
                <Icon name="close" accent="none" strokeWidth={2.4} className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A one-line privacy note for hints: lock for private answers, eye for public ones. */
export function PrivacyNote({ kind, children }: { kind: 'private' | 'public'; children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icon name={kind === 'private' ? 'lock' : 'eye'} accent={kind === 'private' ? 'saffron' : 'teal'} className="mt-0.5 size-4" />
      <span>
        <strong className="font-bold">{kind === 'private' ? 'Private.' : 'Public.'}</strong> {children}
      </span>
    </span>
  )
}
