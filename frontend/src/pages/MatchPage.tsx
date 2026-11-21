import { useEffect, useEffectEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import { SpeechBubble, Star } from '../components/illustrations/Stickers'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { roleLabel } from '../features/onboarding/options'
import { nextOnboardingStep } from '../features/profile/flow'
import { compatibility, toMatchProfile } from '../features/profile/matching'
import { activeTrip } from '../features/profile/model'
import { INTEREST_OPTIONS, labelsFor } from '../features/profile/options'
import { findPartner } from '../lib/api'
import type { User } from '../lib/types'
import { useStore } from '../store/useStore'

const SEARCH_MS = 2500

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Phase = { kind: 'searching' } | { kind: 'found'; partner: User } | { kind: 'error' }

function AvatarDisc({ emoji, className = '' }: { emoji: string; className?: string }) {
  return (
    <span
      className={`grid size-20 place-items-center rounded-full border-4 border-navy bg-paper text-4xl ${className}`}
      aria-hidden
    >
      {emoji}
    </span>
  )
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
      <Screen className="items-center justify-center gap-10 text-center">
        <div className="relative grid size-56 place-items-center" role="status" aria-live="polite">
          {[0, 0.65, 1.3].map((delay) => (
            <span
              key={delay}
              className="absolute inset-0 rounded-full border-4 border-navy bg-bubble/40 motion-safe:animate-ring"
              style={{ animationDelay: `${delay}s` }}
              aria-hidden
            />
          ))}
          <AvatarDisc emoji={user.avatar} className="relative" />
          <span className="sr-only">Finding your partner…</span>
        </div>
        <div>
          <h1 className="text-4xl text-navy">Finding your partner…</h1>
          <p className="mt-2">Looking for {lookingFor}.</p>
        </div>
      </Screen>
    )
  }

  if (phase.kind === 'error') {
    return (
      <Screen className="justify-center gap-6">
        <Card>
          <h1 className="text-2xl">No partner yet</h1>
          <p className="mt-2">We couldn't find anyone just now. Give it another go.</p>
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
  const match = compatibility(me ?? {}, { interests: partner.interests, languages: partner.languages })
  const common = labelsFor(INTEREST_OPTIONS, match.sharedInterests)

  return (
    <Screen className="justify-between gap-8">
      <header className="pt-4 text-center">
        <h1 className="text-4xl text-navy motion-safe:animate-pop">It's a match!</h1>
      </header>

      {/* The two players greeting each other */}
      <div className="flex items-end justify-center gap-6" aria-hidden>
        <div className="flex flex-col items-center gap-6">
          <SpeechBubble tail="left">Hi!</SpeechBubble>
          <AvatarDisc emoji={user.avatar} />
        </div>
        <Star className="mb-6 size-9 motion-safe:animate-wiggle" />
        <div className="flex flex-col items-center gap-6">
          <SpeechBubble tail="right" fill="sun">
            Salut!
          </SpeechBubble>
          <AvatarDisc emoji={partner.avatar} className="bg-bubble-light" />
        </div>
      </div>

      <Card tone="bubble-light" tilt="right" className="motion-safe:animate-pop">
        <div className="flex items-center gap-4">
          <span className="text-6xl" aria-hidden>
            {partner.avatar}
          </span>
          <div className="min-w-0">
            <p className="font-type text-xs tracking-wider uppercase">Your teammate</p>
            <h2 className="truncate text-4xl">{partner.name}</h2>
            <Badge tone="navy" className="mt-1">
              {roleLabel(partner.role)}
            </Badge>
          </div>
        </div>
        {(common.length > 0 || match.sharedLanguages.length > 0) && (
          <p className="mt-4 border-t-[3px] border-dashed border-navy pt-3">
            <span className="font-type text-xs tracking-wider uppercase">In common · </span>
            {[common.length > 0 && `you both love ${common.join(', ')}`, match.sharedLanguages.length > 0 && `you both speak ${match.sharedLanguages.join(', ')}`]
              .filter(Boolean)
              .join('; ')}
            .
          </p>
        )}
        {partner.funFact && (
          <p className="mt-4 border-t-[3px] border-dashed border-navy pt-3">
            <span className="font-type text-xs tracking-wider uppercase">Fun fact · </span>
            {partner.funFact}
          </p>
        )}
      </Card>

      <Button
        size="lg"
        fullWidth
        onClick={() => {
          setPartner(partner)
          navigate('/hunts')
        }}
      >
        Start hunting together
      </Button>
    </Screen>
  )
}
