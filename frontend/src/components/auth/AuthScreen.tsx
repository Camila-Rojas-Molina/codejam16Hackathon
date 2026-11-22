// The shared frame for Log in and Sign up: a printed sheet with the logo, a heading, the mascot,
// a form and a link to the other page.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MascotSays, type MascotPose } from '../illustrations/Mascot'
import Screen from '../layout/Screen'
import Logo from '../ui/Logo'

type AuthScreenProps = {
  eyebrow: string
  title: string
  subtitle?: ReactNode
  pose?: MascotPose
  say?: ReactNode
  children: ReactNode
  /** "New here?" + link to the other auth page. */
  footer?: { text: string; to: string; label: string }
}

export default function AuthScreen({ eyebrow, title, subtitle, pose = 'hello', say, children, footer }: AuthScreenProps) {
  return (
    <Screen className="gap-7 md:max-w-xl">
      <Link to="/" className="self-start" aria-label="Home">
        <Logo size="sm" />
      </Link>
      <header>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2">{subtitle}</p>}
      </header>
      {say && <MascotSays pose={pose}>{say}</MascotSays>}
      {children}
      {footer && (
        <p className="mt-auto border-t-2 border-ink pt-4 text-center">
          {footer.text}{' '}
          <Link to={footer.to} className="font-bold underline decoration-2 underline-offset-4 hover:decoration-sienna">
            {footer.label}
          </Link>
        </p>
      )}
    </Screen>
  )
}
