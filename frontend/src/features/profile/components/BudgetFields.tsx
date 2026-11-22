// Budget level cards plus an optional "about how much per outing" range.
import { useId } from 'react'
import Choices from '../../../components/ui/Choices'
import { ErrorText, fieldLabel, inputBase } from '../../../components/ui/Fields'
import { cn } from '../../../lib/cn'
import { BUDGET_OPTIONS, CURRENCIES, SPEND_MAX } from '../options'
import { rangeError } from '../model'
import type { Budget, Currency, SpendRange } from '../types'

type BudgetFieldsProps = {
  value: Budget
  onChange: (budget: Budget) => void
  legend: string
  hideLegend?: boolean
  /** Currency to suggest when the range is first opened. */
  defaultCurrency?: Currency
}

const numberInput = cn(inputBase, 'min-h-12 min-w-0 px-3 text-lg')

function parseAmount(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Math.round(Number(raw))
  return Number.isFinite(n) ? Math.min(SPEND_MAX, Math.max(0, n)) : null
}

export default function BudgetFields({ value, onChange, legend, hideLegend, defaultCurrency = 'CAD' }: BudgetFieldsProps) {
  const id = useId()
  const range: SpendRange = value.range ?? { min: null, max: null, currency: defaultCurrency }
  const error = rangeError(value.range)

  const setRange = (patch: Partial<SpendRange>) => {
    const next = { ...range, ...patch }
    // An empty range is stored as "no range".
    onChange({ ...value, range: next.min === null && next.max === null ? null : next })
  }

  return (
    <div className="space-y-6">
      <Choices
        legend={legend}
        hideLegend={hideLegend}
        options={BUDGET_OPTIONS}
        value={value.level}
        // Free means free: drop any spending range.
        onChange={(level) => onChange({ level, range: level === 'free' ? null : value.range })}
      />

      {value.level && value.level !== 'free' && (
        <fieldset className="border-2 border-dashed border-ink p-4" aria-describedby={`${id}-hint`}>
          <legend className={`${fieldLabel} px-1`}>
            Roughly per outing <span className="font-medium tracking-normal normal-case">(optional)</span>
          </legend>
          <p id={`${id}-hint`} className="-mt-1 mb-3 text-sm">
            Just a ballpark. It helps us suggest things that fit, and it’s never shown to anyone.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor={`${id}-min`} className="mb-1 block text-sm font-semibold">
                From
              </label>
              <input
                id={`${id}-min`}
                type="number"
                inputMode="numeric"
                min={0}
                max={SPEND_MAX}
                placeholder="20"
                value={range.min ?? ''}
                onChange={(e) => setRange({ min: parseAmount(e.target.value) })}
                aria-invalid={error ? true : undefined}
                className={numberInput}
              />
            </div>
            <span className="pb-3 font-bold" aria-hidden>
              –
            </span>
            <div className="flex-1">
              <label htmlFor={`${id}-max`} className="mb-1 block text-sm font-semibold">
                Up to
              </label>
              <input
                id={`${id}-max`}
                type="number"
                inputMode="numeric"
                min={0}
                max={SPEND_MAX}
                placeholder="60"
                value={range.max ?? ''}
                onChange={(e) => setRange({ max: parseAmount(e.target.value) })}
                aria-invalid={error ? true : undefined}
                className={numberInput}
              />
            </div>
            <div className="w-24 shrink-0">
              <label htmlFor={`${id}-cur`} className="mb-1 block text-sm font-semibold">
                Currency
              </label>
              <select
                id={`${id}-cur`}
                value={range.currency}
                onChange={(e) => setRange({ currency: e.target.value as Currency })}
                className={cn(inputBase, 'min-h-12 px-2')}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
        </fieldset>
      )}
    </div>
  )
}
