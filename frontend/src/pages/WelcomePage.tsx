import { Link, Navigate } from 'react-router'
import Screen from '../components/layout/Screen'
import { Squiggle, Star } from '../components/illustrations/Stickers'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import Logo from '../components/ui/Logo'
import { nextOnboardingStep } from '../features/profile/flow'
import { TAGLINE } from '../lib/config'
import { useStore } from '../store/useStore'

const steps = [
  { n: '1', text: 'Be a tourist or a local. Switch any time.' },
  { n: '2', text: 'Get matched and a photo of a mystery spot.' },
  { n: '3', text: 'Find it together. Phone away. Selfie. Points.' },
]

export default function WelcomePage() {
  const { account, profile } = useStore()

  // Returning player: pick up where they left off (never repeat onboarding).
  if (account) return <Navigate to={nextOnboardingStep(account, profile) ?? '/hunts'} replace />

  return (
    <Screen className="justify-between gap-8">
      <section className="relative pt-10 text-center">
        <Star className="absolute top-0 left-2 size-12 -rotate-12 motion-safe:animate-wiggle" />
        <Star className="absolute top-24 right-0 size-8 rotate-12" fill="var(--color-bubble-light)" />
        <Logo className="mx-auto" />
        <Squiggle className="mx-auto mt-3" />
        {/* Navy on sky = 5.1:1 */}
        <h1 className="mt-5 text-3xl leading-tight text-navy">{TAGLINE}</h1>
      </section>

      <Card tilt="left">
        <h2 className="mb-3 text-xl">How it works</h2>
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.n} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-[3px] border-navy bg-sun font-type text-ink">
                {s.n}
              </span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Link to="/onboarding" className={buttonClasses({ size: 'lg', fullWidth: true })}>
        Start a quest
      </Link>
    </Screen>
  )
}
