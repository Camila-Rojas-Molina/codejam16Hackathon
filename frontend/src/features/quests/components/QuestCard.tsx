// One challenge: what to do, progress, reward and its state (in progress → claim → done).
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { Mascot } from '../../../components/illustrations/Mascot'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { ErrorText } from '../../../components/ui/Fields'
import { arrowButtonClasses, arrowLabel } from '../../../components/ui/buttonStyles'
import { ArrowCell } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'
import { useStore } from '../../../store/useStore'
import { CADENCE_LABELS, type ChallengeState } from '../challenges'

/** Ruled progress bar: saffron fill over hatching, with the count printed on top. */
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
        className="hatch-soft relative h-7 overflow-hidden border-2 border-ink bg-sheet"
      >
        <div className="absolute inset-y-0 left-0 bg-saffron transition-[width] duration-500 ease-spring" style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="bg-sheet px-2 text-xs font-bold tabular-nums">
            {progress} / {c.target}
          </span>
        </span>
      </div>
    </div>
  )
}

export function RewardChip({ points, className }: { points: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 border-2 border-ink bg-saffron py-0.5 pr-2 pl-1 text-xs font-bold text-ink', className)}>
      <Icon name="coin" accent="sheet" className="size-5" />+{points}
      <span className="sr-only"> points</span>
    </span>
  )
}

export default function QuestCard({ state, highlight = false }: { state: ChallengeState; highlight?: boolean }) {
  const { claimChallenge } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState(false)
  const { challenge: c, status } = state

  async function claim() {
    setBusy(true)
    setError(null)
    try {
      await claimChallenge(c.id)
      setJustClaimed(true)
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
        'relative scroll-mt-24 border-2 border-ink',
        status === 'claimed' ? 'bg-teal-soft' : 'sheet-grain',
        highlight ? 'shadow-block outline-4 outline-offset-4 outline-saffron' : 'shadow-block-sm',
      )}
    >
      <div className="flex items-stretch border-b-2 border-ink">
        <span className="grid w-20 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft" aria-hidden>
          <Icon name={c.icon} className="size-10" />
        </span>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="ink">{CADENCE_LABELS[c.cadence]}</Badge>
            <RewardChip points={c.reward} />
          </div>
          <h3 id={`quest-${c.id}-title`} className="mt-2 text-2xl">
            {c.title}
          </h3>
        </div>
        {status === 'claimed' && (
          <Badge stamp className="absolute top-3 right-3 bg-sheet">
            Done
          </Badge>
        )}
      </div>

      <div className="space-y-4 p-4">
        <p>{c.description}</p>
        <p className="flex items-center gap-2 text-sm font-bold">
          <Icon name="flag" accent="sienna" className="size-5" />
          {c.objective}
        </p>
        <QuestProgress state={state} />

        <div className="flex flex-wrap items-center gap-3">
          {status === 'ready' && (
            <Button onClick={claim} disabled={busy} icon="coin">
              {busy ? 'Claiming…' : `Claim ${c.reward} points`}
            </Button>
          )}
          {status === 'in-progress' && (
            <Link to={c.action.to} className={arrowButtonClasses({ tone: 'saffron' })}>
              <span className={arrowLabel}>{c.action.label}</span>
              <ArrowCell />
            </Link>
          )}
          {status === 'claimed' && (
            <p className="flex items-center gap-3 font-bold">
              {justClaimed && <Mascot pose="leap" className="h-20" label="Migo leaping for joy" />}
              <span className="flex items-center gap-2">
                <Icon name="check" accent="none" strokeWidth={2.6} className="size-5 text-teal-deep" />+{c.reward} points earned. Nice!
              </span>
            </p>
          )}
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </article>
  )
}
