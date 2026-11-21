// QUESTS: the daily challenge plus any other challenges, grouped by cadence, with progress,
// rewards and completion. Sections only appear when they have challenges in them.
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { PointsIcon } from '../components/illustrations/Icons'
import { pointsBalance, pointsEarned } from '../features/profile/model'
import { CADENCE_LABELS, type Cadence } from '../features/quests/challenges'
import QuestCard from '../features/quests/components/QuestCard'
import { useChallenges } from '../features/quests/useChallenges'
import { useStore } from '../store/useStore'

const ORDER: Cadence[] = ['daily', 'weekly', 'seasonal', 'special', 'starter']
const BLURB: Record<Cadence, string> = {
  daily: 'A fresh one every day.',
  weekly: 'Resets every Monday.',
  seasonal: 'Here for a limited time.',
  special: 'One-off events.',
  starter: 'One-time rewards for getting set up.',
}

export default function QuestsPage() {
  const { profile } = useStore()
  const { all, readyCount } = useChallenges()
  const { hash } = useLocation()
  const target = hash.startsWith('#quest-') ? hash.slice(1) : null

  // Arriving from the Daily Quest card: bring that quest into view.
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'center' })
  }, [target])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-navy sm:text-5xl">Quests</h1>
          <p className="mt-1">Complete challenges, earn points, treat Migo in the shop.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border-[3px] border-navy bg-paper px-4 py-2">
          <PointsIcon className="size-9" />
          <div>
            <p className="font-display text-2xl leading-none">{pointsBalance(profile?.rewards).toLocaleString()}</p>
            <p className="text-xs">{pointsEarned(profile?.rewards).toLocaleString()} earned in total</p>
          </div>
        </div>
      </header>

      {readyCount > 0 && (
        <p role="status" className="rounded-2xl border-[3px] border-navy bg-sun px-4 py-2 font-semibold text-ink">
          🎉 {readyCount} reward{readyCount === 1 ? '' : 's'} ready to claim!
        </p>
      )}

      {ORDER.map((cadence) => {
        const items = all.filter((s) => s.challenge.cadence === cadence)
        if (items.length === 0) return null
        return (
          <section key={cadence} aria-labelledby={`cadence-${cadence}`} className="space-y-4">
            <div>
              <h2 id={`cadence-${cadence}`} className="text-3xl text-navy">
                {cadence === 'daily' ? 'Daily challenge' : CADENCE_LABELS[cadence]}
              </h2>
              <p className="text-sm">{BLURB[cadence]}</p>
            </div>
            <div className="space-y-4">
              {items.map((state) => (
                <QuestCard key={state.challenge.id} state={state} highlight={target === `quest-${state.challenge.id}`} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
