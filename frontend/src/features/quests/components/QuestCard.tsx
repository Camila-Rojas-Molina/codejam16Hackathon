// One challenge: what to do, progress, reward and its state (in progress → claim → done).
import { useState } from 'react'
import { Link } from 'react-router'
import { PointsIcon } from '../../../components/illustrations/Icons'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { CADENCE_LABELS, type ChallengeState } from '../challenges'

export function QuestProgress({ state, className }: { state: ChallengeState; className?: string }) {
  const { progress, challenge: c } = state
  const pct = Math.round((progress / c.target) * 100)
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={`${c.title} progress`}
        aria-valuemin={0}
        aria-valuemax={c.target}
        aria-valuenow={progress}
        aria-valuetext={`${progress} of ${c.target}`}
        className="relative h-6 overflow-hidden rounded-full border-[3px] border-navy bg-paper"
      >
        <div className="h-full bg-sun transition-[width] duration-500 ease-spring" style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 grid place-items-center font-type text-xs text-ink">
          {progress} / {c.target}
        </span>
      </div>
    </div>
  )
}

export function RewardChip({ points, className }: { points: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border-2 border-navy bg-sun py-0.5 pr-2.5 pl-1 font-type text-xs text-ink', className)}>
      <PointsIcon className="size-5" />+{points}
      <span className="sr-only"> points</span>
    </span>
  )
}

export default function QuestCard({ state, highlight = false }: { state: ChallengeState; highlight?: boolean }) {
  const { claimChallenge } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { challenge: c, status } = state

  async function claim() {
    setBusy(true)
    setError(null)
    try {
      await claimChallenge(c.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t claim that. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      id={`quest-${c.id}`}
      aria-labelledby={`quest-${c.id}-title`}
      className={cn(
        'relative scroll-mt-24 rounded-[1.5rem_1.3rem_1.6rem_1.2rem] border-[3px] border-navy p-4 transition-shadow sm:p-5',
        status === 'claimed' ? 'bg-bubble-light' : 'bg-paper',
        highlight && 'shadow-[0_0_0_4px_var(--color-sun),0_0_0_7px_var(--color-navy)]',
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-[3px] border-navy bg-bubble text-3xl" aria-hidden>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="navy">{CADENCE_LABELS[c.cadence]}</Badge>
            <RewardChip points={c.reward} />
          </div>
          <h3 id={`quest-${c.id}-title`} className="mt-2 text-2xl leading-tight">
            {c.title}
          </h3>
          <p className="mt-1">{c.description}</p>
          <p className="mt-2 text-sm font-semibold">🎯 {c.objective}</p>
        </div>
        {status === 'claimed' && (
          <Badge stamp className="absolute top-3 right-3 bg-paper">
            Done ✓
          </Badge>
        )}
      </div>

      <QuestProgress state={state} className="mt-4" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {status === 'ready' && (
          <Button variant="sun" onClick={claim} disabled={busy}>
            {busy ? 'Claiming…' : `Claim ${c.reward} points`}
          </Button>
        )}
        {status === 'in-progress' && (
          <Link to={c.action.to} className={buttonClasses({ variant: 'secondary' })}>
            {c.action.label} →
          </Link>
        )}
        {status === 'claimed' && <p className="font-semibold">+{c.reward} points earned. Nice!</p>}
        {error && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
