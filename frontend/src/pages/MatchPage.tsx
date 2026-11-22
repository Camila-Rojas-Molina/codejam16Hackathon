import { useEffect, useEffectEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import { Sparkle, SpeechBubble } from '../components/illustrations/Stickers'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { modeMeta, roleLabel } from '../features/onboarding/options'
import { nextOnboardingStep } from '../features/profile/flow'
import { compatibility, toMatchProfile } from '../features/profile/matching'
import { activeTrip } from '../features/profile/model'
import { INTEREST_OPTIONS, labelsFor } from '../features/profile/options'
import { asMatchProfile, findPartner } from '../lib/api'
import type { User } from '../lib/types'
import { useStore } from '../store/useStore'

const SEARCH_MS = 2500

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Phase = { kind: 'searching' } | { kind: 'found'; partner: User } | { kind: 'error' }

function AvatarDisc({ emoji, className = '' }: { emoji: string; className?: string }) {
  return <Avatar avatar={emoji} size="lg" className={className} />
}

export default function MatchPage() {
  const { user, account, profile, setPartner } = useStore()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'searching' })
  const [attempt, setAttempt] = useState(0)

  // What we match on: the active mode's effective preferences (trip details override the defaults).
  const me = toMatchProfile(profile)
  const search = useEffectEvent((r: User['role']) => Promise.all([findPartner(r, me), wait(SEARCH_MS)]))
  const userId = user?.id
  const role = user?.role
  const next = nextOnboardingStep(account, profile)

  useEffect(() => {
    if (!userId || !role || next) return
    let cancelled = false
    // Always show the search for ~2.5 s, even if the API answers sooner.
    search(role)
      .then(([partner]) => !cancelled && setPhase({ kind: 'found', partner }))
      .catch(() => !cancelled && setPhase({ kind: 'error' }))
    return () => {
      cancelled = true
    }
  }, [userId, role, next, attempt])

  if (next) return <Navigate to={next} replace />
  if (!user) return <Navigate to="/onboarding" replace />

  const trip = activeTrip(profile)
  const lookingFor =
    user.role === 'tourist'
      ? `a local who knows ${trip?.destination || 'the city'}`
      : `a visitor to show around ${profile?.local?.homeCity || 'your city'}`

  if (phase.kind === 'searching') {
    return (
      <Screen className="items-center justify-center gap-8 text-center">
        <div className="relative grid size-64 place-items-center" role="status" aria-live="polite">
          {[0, 0.65, 1.3].map((delay) => (
            <span
              key={delay}
              className="absolute inset-6 border-2 border-ink bg-saffron-soft/50 motion-safe:animate-ring"
              style={{ animationDelay: `${delay}s` }}
              aria-hidden
            />
          ))}
          <Mascot pose="search" className="relative h-52" />
          <span className="sr-only">Finding your partner…</span>
        </div>
        <div>
          <p className="eyebrow mb-2">Matching</p>
          <h1 className="text-4xl">Finding your partner…</h1>
          <p className="mt-2 font-serif text-xl">Looking for {lookingFor}.</p>
        </div>
      </Screen>
    )
  }

  if (phase.kind === 'error') {
    return (
      <Screen className="justify-center gap-6">
        <div className="flex justify-center">
          <Mascot pose="ponder" className="h-40" label />
        </div>
        <Card>
          <h1 className="text-3xl">No partner yet</h1>
          <p className="mt-2">We couldn’t find anyone just now. Give it another go.</p>
        </Card>
        <Button
          size="lg"
          fullWidth
          onClick={() => {
            setPhase({ kind: 'searching' })
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
      </Screen>
    )
  }

  const { partner } = phase
  const match = compatibility(me ?? {}, asMatchProfile(partner))
  const common = labelsFor(INTEREST_OPTIONS, match.sharedInterests)

  return (
    <Screen className="justify-between gap-8 md:max-w-xl">
      <header className="pt-4 text-center">
        <p className="eyebrow mb-2">Matched</p>
        <h1 className="title-retro font-display text-5xl motion-safe:animate-pop">It’s a match!</h1>
      </header>

      {/* The two players greeting each other */}
      <div className="flex items-end justify-center gap-6" aria-hidden>
        <div className="flex flex-col items-center gap-6">
          <SpeechBubble tail="left">Hi!</SpeechBubble>
          <AvatarDisc emoji={user.avatar} />
        </div>
        <Sparkle className="mb-8 size-9 motion-safe:animate-wiggle" />
        <div className="flex flex-col items-center gap-6">
          <SpeechBubble tail="right" tone="saffron">
            Salut!
          </SpeechBubble>
          <AvatarDisc emoji={partner.avatar} />
        </div>
      </div>

      <article className="sheet-grain border-2 border-ink shadow-block motion-safe:animate-pop">
        <div className="flex items-stretch border-b-2 border-ink">
          <div className="grid shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft p-3">
            <Avatar avatar={partner.avatar} size="xl" className="border-0 bg-transparent" />
          </div>
          <div className="min-w-0 flex-1 p-4">
            <p className="eyebrow">Your teammate</p>
            <h2 className="truncate text-4xl">{partner.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone={partner.role === 'local' ? 'teal' : 'saffron'} icon={modeMeta(partner.role).icon}>
                {roleLabel(partner.role)}
              </Badge>
              {match.dogDuo && (
                <Badge tone="sandy" icon="paw">
                  Dog duo
                </Badge>
              )}
            </div>
          </div>
        </div>
        {(common.length > 0 || match.sharedLanguages.length > 0) && (
          <p className="flex items-start gap-2 border-b-2 border-ink px-4 py-3">
            <Icon name="venn" className="size-5" />
            <span>
              <span className="eyebrow mr-1">In common</span>
              {[common.length > 0 && `you both love ${common.join(', ')}`, match.sharedLanguages.length > 0 && `you both speak ${match.sharedLanguages.join(', ')}`]
                .filter(Boolean)
                .join('; ')}
              .
            </span>
          </p>
        )}
        {partner.funFact && (
          <p className="px-4 py-3 font-serif text-lg leading-snug">
            <span className="eyebrow mr-2 align-middle">Fun fact</span>
            {partner.funFact}
          </p>
        )}
      </article>

      <Button
        size="lg"
        fullWidth
        onClick={() => {
          setPartner(partner)
          navigate('/hunts')
        }}
      >
        Start hunting together
        <Icon name="arrow-right" accent="none" strokeWidth={2.4} className="size-5" />
      </Button>
    </Screen>
  )
}
