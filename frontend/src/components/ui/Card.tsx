import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardTone = 'paper' | 'bubble-light' | 'bubble' | 'sun' | 'navy'
type CardTilt = 'none' | 'left' | 'right'

type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string
  tone?: CardTone
  /** Slight hand-placed rotation (±1°). */
  tilt?: CardTilt
  /** Adds the squish-on-tap feel. Use when the whole card is a link or button. */
  interactive?: boolean
  children: ReactNode
}

const tones: Record<CardTone, string> = {
  paper: 'bg-paper text-navy',
  'bubble-light': 'bg-bubble-light text-navy',
  bubble: 'bg-bubble text-navy',
  sun: 'bg-sun text-ink',
  navy: 'bg-navy text-paper',
}

const tilts: Record<CardTilt, string> = {
  none: '',
  left: '-rotate-1',
  right: 'rotate-1',
}

export default function Card({
  title,
  tone = 'paper',
  tilt = 'none',
  interactive,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        // Uneven corner radii give a slightly hand-cut feel.
        'rounded-[1.6rem_1.4rem_1.7rem_1.3rem] border-[3px] border-navy p-5',
        tones[tone],
        tilts[tilt],
        interactive && 'cursor-pointer transition-transform duration-100 active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {title && <h2 className="mb-3 text-2xl">{title}</h2>}
      {children}
    </section>
  )
}
