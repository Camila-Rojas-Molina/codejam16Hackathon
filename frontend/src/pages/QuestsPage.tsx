// QUESTS: the daily challenge plus any other challenges, grouped by cadence, with progress,
// rewards and completion. Sections only appear when they have challenges in them.
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import PageHeader from '../components/ui/PageHeader'
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
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <PageHeader
        eyebrow="Challenges & rewards"
        title="Quests"
        description="Complete challenges, earn points, treat Migo in the shop."
        aside={
          <div className="flex items-end gap-3">
            <Mascot pose="play" className="hidden h-28 sm:block" />
            <div className="flex items-center gap-3 border-2 border-ink bg-saffron px-4 py-3">
              <Icon name="coin" accent="sheet" className="size-10" />
              <div>
                <p className="font-display text-3xl leading-none">{pointsBalance(profile?.rewards).toLocaleString()}</p>
                <p className="text-xs font-semibold">{pointsEarned(profile?.rewards).toLocaleString()} earned in total</p>
              </div>
            </div>
          </div>
        }
      />

      {readyCount > 0 && (
        <p role="status" className="flex items-center gap-3 border-2 border-ink bg-teal-soft px-4 py-2 font-semibold">
          <Icon name="trophy" className="size-7" />
          {readyCount} reward{readyCount === 1 ? '' : 's'} ready to claim!
        </p>
      )}

      {ORDER.map((cadence) => {
        const items = all.filter((s) => s.challenge.cadence === cadence)
        if (items.length === 0) return null
        return (
          <section key={cadence} aria-labelledby={`cadence-${cadence}`} className="space-y-4">
            <div>
              <h2 id={`cadence-${cadence}`} className="text-3xl">
                {cadence === 'daily' ? 'Daily challenge' : CADENCE_LABELS[cadence]}
              </h2>
              <p className="text-sm">{BLURB[cadence]}</p>
            </div>
            <div className="space-y-5">
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
