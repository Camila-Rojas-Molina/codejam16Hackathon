// Budget level cards plus an optional "about how much per outing" range.
import { useId } from 'react'
import Choices from '../../../components/ui/Choices'
import { fieldLabel } from '../../../components/ui/Fields'
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

const numberInput =
  'min-h-12 w-full min-w-0 rounded-full border-[3px] border-navy bg-paper px-4 text-lg text-navy placeholder:text-navy/60 aria-invalid:border-dashed aria-invalid:border-red'

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
        <fieldset className="rounded-[1.3rem_1.1rem_1.4rem_1rem] border-[3px] border-dashed border-navy p-4" aria-describedby={`${id}-hint`}>
          <legend className={`${fieldLabel} px-1`}>
            Roughly per outing <span className="normal-case opacity-80">(optional)</span>
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
            <span className="pb-3 font-type" aria-hidden>
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
                className="min-h-12 w-full rounded-full border-[3px] border-navy bg-paper px-3 text-navy"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 inline-block rounded-lg border-2 border-navy bg-sun px-2 py-0.5 text-sm text-ink">
              {error}
            </p>
          )}
        </fieldset>
      )}
    </div>
  )
}
