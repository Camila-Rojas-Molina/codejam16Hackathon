// One question (or a small group) per screen: back, progress, heading, content, Continue.
// Used by the onboarding questionnaire and the Tourist/Local setups.
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Button from '../ui/Button'
import Screen from './Screen'

export type ProgressSegment = {
  label: string
  /** 0–1 */
  value: number
  current?: boolean
}

function Progress({ segments, counter }: { segments: ProgressSegment[]; counter?: string }) {
  const current = segments.find((s) => s.current) ?? segments[0]
  const overall = segments.reduce((sum, s) => sum + s.value, 0) / segments.length
  return (
    <div className="min-w-0 flex-1">
      <div
        role="progressbar"
        aria-label={segments.length > 1 ? `Progress, ${current.label}` : 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(overall * 100)}
        aria-valuetext={counter}
        className="flex gap-1.5"
      >
        {segments.map((s) => (
          <div key={s.label} className="h-4 flex-1 overflow-hidden rounded-full border-[3px] border-navy bg-paper">
            <div
              className="h-full rounded-full bg-red transition-[width] duration-500 ease-spring"
              style={{ width: `${Math.round(s.value * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-1 flex justify-between gap-2 font-type text-xs tracking-wider uppercase" aria-hidden>
        <span className="truncate">{current.label}</span>
        {counter && <span className="shrink-0">{counter}</span>}
      </p>
    </div>
  )
}

type StepScreenProps = {
  /** Changes on every step: restarts the entrance animation and moves focus to the heading. */
  stepKey: string
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  progress?: ProgressSegment[]
  counter?: string
  onBack?: () => void
  backLabel?: string
  onExit?: () => void
  exitLabel?: string
  /** Form submit: Enter in a text field continues, like the button. */
  onContinue: () => void
  continueLabel?: string
  canContinue?: boolean
  /** Why Continue is disabled, read out politely. */
  blockedReason?: string | null
  onSkip?: () => void
  skipLabel?: string
  busy?: boolean
  error?: string | null
  hero?: ReactNode
  children?: ReactNode
}

export default function StepScreen({
  stepKey,
  eyebrow,
  title,
  subtitle,
  progress,
  counter,
  onBack,
  backLabel = 'Back',
  onExit,
  exitLabel = 'Close',
  onContinue,
  continueLabel = 'Continue',
  canContinue = true,
  blockedReason,
  onSkip,
  skipLabel = 'Skip for now',
  busy = false,
  error,
  hero,
  children,
}: StepScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new question so screen readers announce it and keyboard users start at the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0 })
  }, [stepKey])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (canContinue && !busy) onContinue()
  }

  return (
    <Screen className="md:max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-navy bg-paper font-type text-xl text-navy transition-transform active:scale-90"
            >
              <span aria-hidden>←</span>
            </button>
          ) : (
            <span className="size-12 shrink-0" aria-hidden />
          )}
          {progress ? <Progress segments={progress} counter={counter} /> : <div className="flex-1" />}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="min-h-12 shrink-0 rounded-full px-2 font-type text-xs tracking-wider text-navy uppercase underline-offset-4 hover:underline"
            >
              {exitLabel}
            </button>
          )}
        </div>

        <div key={stepKey} className="flex flex-1 flex-col pt-6 motion-safe:animate-step-in">
          {hero}
          <header className="mb-6">
            {eyebrow && <p className="mb-1 font-type text-sm tracking-wider uppercase">{eyebrow}</p>}
            <h1 ref={headingRef} tabIndex={-1} className="text-3xl leading-tight text-navy outline-none sm:text-4xl">
              {title}
            </h1>
            {subtitle && <div className="mt-2 text-base">{subtitle}</div>}
          </header>
          <div className="space-y-6">{children}</div>
        </div>

        {/* Sticky footer so Continue is always reachable on long screens. */}
        <div className="sticky bottom-0 -mx-5 mt-8 bg-sky px-5 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {error && (
            <p role="alert" className="mb-3 rounded-2xl border-[3px] border-navy bg-sun px-4 py-2 text-ink">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" fullWidth disabled={!canContinue || busy} aria-busy={busy || undefined}>
            {busy ? 'Saving…' : continueLabel}
          </Button>
          <div className={cn('flex min-h-12 items-center justify-center', !onSkip && !blockedReason && 'min-h-2')}>
            {onSkip ? (
              <Button variant="ghost" onClick={onSkip} className="min-h-11 text-sm">
                {skipLabel}
              </Button>
            ) : (
              <p className="text-center text-sm" aria-live="polite">
                {!canContinue && blockedReason}
              </p>
            )}
          </div>
        </div>
      </form>
    </Screen>
  )
}
