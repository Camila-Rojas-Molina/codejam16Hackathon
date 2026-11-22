// "/" Welcome: a printed masthead. Migo strolls in from one side and leaps on the other, the logo
// and tagline sit in the middle cell, and three numbered cells explain the idea.
import { Link, Navigate } from 'react-router'
import Icon, { type IconName } from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import { Sparkle, Starburst } from '../components/illustrations/Stickers'
import Screen from '../components/layout/Screen'
import { ArrowCell } from '../components/ui/Button'
import { arrowButtonClasses, arrowLabel, buttonClasses } from '../components/ui/buttonStyles'
import Logo from '../components/ui/Logo'
import { hasUniversalProfile } from '../features/profile/flow'
import { TAGLINE } from '../lib/config'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

const steps: { n: string; title: string; text: string; icon: IconName }[] = [
  { n: '1', title: 'Pick a mode', text: 'Be a tourist or a local. Switch any time.', icon: 'suitcase' },
  { n: '2', title: 'Get matched', text: 'Meet your teammate and a photo of a mystery spot.', icon: 'people2' },
  { n: '3', title: 'Go find it', text: 'Explore together, phone away, then a selfie for points.', icon: 'camera' },
]

// The main call to action: one big saffron button, label and arrow on a single surface.
const cta = arrowButtonClasses({ tone: 'saffron', size: 'lg', fullWidth: true })

export default function WelcomePage() {
  const { account, profile, authEnabled, session } = useStore()

  // Returning player: straight into the app (never repeat onboarding).
  if (account) return <Navigate to={hasUniversalProfile(profile) ? '/map' : '/onboarding/questions'} replace />
  // Logged in but no profile yet (e.g. just confirmed their email): name & avatar next.
  if (authEnabled && session) return <Navigate to="/onboarding" replace />

  return (
    <Screen className="gap-6 md:max-w-4xl">
      {/* Masthead */}
      <section className="border-2 border-ink">
        <div className="grid md:grid-cols-[1fr_2fr_1fr]">
          <div className="relative hidden place-items-center overflow-hidden border-r-2 border-ink p-4 md:grid">
            <Starburst tone="teal-soft" className="absolute size-44 motion-safe:animate-spin-slow" />
            <Mascot pose="hello" className="relative h-40" label />
          </div>
          <div className="relative flex flex-col items-center justify-center gap-4 px-5 py-8 text-center">
            <Sparkle className="absolute top-4 left-5 size-7 motion-safe:animate-wiggle" />
            <Sparkle tone="teal-soft" className="absolute right-6 bottom-6 size-5" />
            <p className="eyebrow">Travel · Friends · Hunts</p>
            <Logo size="lg" className="mx-auto h-20 sm:h-24" />
            <h1 className="title-retro font-display text-3xl leading-[1.05] tracking-wide sm:text-4xl">{TAGLINE}</h1>
          </div>
          <div className="relative hidden place-items-center overflow-hidden border-l-2 border-ink p-4 md:grid">
            <Starburst tone="sienna" className="absolute size-44 opacity-90 motion-safe:animate-spin-slow" />
            <Mascot pose="leap" className="relative h-40" label />
          </div>
        </div>
        {/* Phones: the two mascots side by side under the title */}
        <div className="relative flex items-end justify-center gap-6 overflow-hidden border-t-2 border-ink py-4 md:hidden">
          <Starburst tone="teal-soft" className="absolute -left-10 size-40" />
          <Starburst tone="sienna" className="absolute -right-10 size-40 opacity-90" />
          <Mascot pose="hello" className="relative h-32" label />
          <Mascot pose="leap" className="relative h-32" label />
        </div>
        <div className="hatch-band" aria-hidden />
        <ol className="grid md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.n} className={cn('flex gap-4 p-5', i > 0 && 'border-t-2 border-ink md:border-t-0 md:border-l-2')}>
              <span className="font-display text-5xl leading-none text-sienna-deep" aria-hidden>
                {s.n}
              </span>
              <div>
                <h2 className="flex items-center gap-2 text-xl">
                  <Icon name={s.icon} className="size-6" />
                  {s.title}
                </h2>
                <p className="mt-1 text-sm">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {authEnabled ? (
        <div className="space-y-3">
          <Link to="/signup" className={cta}>
            <span className={arrowLabel}>Get started</span>
            <ArrowCell />
          </Link>
          <Link to="/login" className={buttonClasses({ variant: 'secondary', size: 'lg', fullWidth: true })}>
            I already have an account
          </Link>
        </div>
      ) : (
        <Link to="/onboarding" className={cta}>
          <span className={arrowLabel}>Start exploring</span>
          <ArrowCell />
        </Link>
      )}
      <p className="text-center font-serif text-lg">One account, two ways to explore. It takes about four minutes to set up.</p>
    </Screen>
  )
}
