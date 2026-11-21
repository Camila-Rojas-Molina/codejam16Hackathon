// A short step-by-step setup with a review screen at the end (Tourist trip, Local profile).
// Owns the draft, the current step and "Change → back to review" behaviour; callers supply steps.
import { useState, type ReactNode } from 'react'
import StepScreen from './StepScreen'

export type SetupStep<D> = {
  id: string
  title: string
  subtitle?: ReactNode
  optional?: boolean
  isAnswered?: (draft: D) => boolean
  isValid: (draft: D) => boolean
  blockedReason?: string
  render: (draft: D, update: (change: (draft: D) => D) => void) => ReactNode
}

type SetupFlowProps<D> = {
  /** Shown in the progress bar, e.g. "Trip setup". */
  label: string
  steps: SetupStep<D>[]
  initial: D
  /** Editing something that already exists: open on the review screen. */
  startAtReview?: boolean
  /** Hero shown above the first step (e.g. Migo explaining the mode). */
  intro?: ReactNode
  reviewTitle: string
  reviewSubtitle?: ReactNode
  renderReview: (draft: D, edit: (stepId: string) => void) => ReactNode
  saveLabel: string
  onSave: (draft: D) => Promise<void>
  onCancel: () => void
  cancelLabel?: string
}

export default function SetupFlow<D>({
  label,
  steps,
  initial,
  startAtReview = false,
  intro,
  reviewTitle,
  reviewSubtitle,
  renderReview,
  saveLabel,
  onSave,
  onCancel,
  cancelLabel = 'Cancel',
}: SetupFlowProps<D>) {
  const reviewIndex = steps.length
  const [draft, setDraft] = useState<D>(initial)
  const [index, setIndex] = useState(startAtReview ? reviewIndex : 0)
  const [returnToReview, setReturnToReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goTo = (i: number) => {
    setError(null)
    setIndex(Math.min(Math.max(0, i), reviewIndex))
  }
  const update = (change: (d: D) => D) => {
    setError(null)
    setDraft(change)
  }

  const onReview = index === reviewIndex
  const progress = [{ label, value: (index + (onReview ? 0 : 1)) / steps.length, current: true }]

  function back() {
    if (returnToReview && !onReview) {
      setReturnToReview(false)
      return goTo(reviewIndex)
    }
    if (index === 0) return onCancel()
    goTo(index - 1)
  }

  async function save() {
    const invalid = steps.findIndex((s) => !s.isValid(draft))
    if (invalid >= 0) {
      setReturnToReview(true)
      goTo(invalid)
      setError('This one still needs an answer.')
      return
    }
    setBusy(true)
    try {
      await onSave(draft)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t save that. Please try again.')
      setBusy(false)
    }
  }

  const common = {
    progress,
    counter: onReview ? 'Review' : `${index + 1} of ${steps.length}`,
    onBack: back,
    onExit: onCancel,
    exitLabel: cancelLabel,
    error,
    busy,
  }

  if (onReview) {
    return (
      <StepScreen {...common} stepKey="review" title={reviewTitle} subtitle={reviewSubtitle} onContinue={save} continueLabel={saveLabel}>
        {renderReview(draft, (stepId) => {
          const at = steps.findIndex((s) => s.id === stepId)
          if (at < 0) return
          setReturnToReview(true)
          goTo(at)
        })}
      </StepScreen>
    )
  }

  const step = steps[index]
  const skipping = step.optional && step.isAnswered && !step.isAnswered(draft)
  return (
    <StepScreen
      {...common}
      stepKey={step.id}
      title={step.title}
      subtitle={step.subtitle}
      eyebrow={step.optional ? 'Optional' : undefined}
      hero={index === 0 && !returnToReview ? intro : undefined}
      onContinue={() => {
        if (returnToReview) {
          setReturnToReview(false)
          return goTo(reviewIndex)
        }
        goTo(index + 1)
      }}
      canContinue={step.isValid(draft)}
      blockedReason={step.blockedReason}
      continueLabel={returnToReview ? 'Back to review' : skipping ? 'Skip for now' : 'Continue'}
    >
      {step.render(draft, update)}
    </StepScreen>
  )
}
