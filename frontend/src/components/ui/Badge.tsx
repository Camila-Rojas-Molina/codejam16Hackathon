import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Icon, { type IconName } from '../icons/Icon'

export type BadgeTone = 'saffron' | 'teal' | 'sienna' | 'sandy' | 'ink' | 'outline'

type BadgeProps = {
  tone?: BadgeTone
  icon?: IconName
  /** Rubber-stamp look for completed things: tilted, double border, display caps. */
  stamp?: boolean
  className?: string
  children: ReactNode
}

// Small ruled label. Every pairing is ink on a soft tint (≥7:1) or paper on ink (9.3:1).
const tones: Record<BadgeTone, string> = {
  saffron: 'bg-saffron-soft text-ink border-ink',
  teal: 'bg-teal-soft text-ink border-ink',
  sienna: 'bg-sienna-soft text-ink border-ink',
  sandy: 'bg-sandy-soft text-ink border-ink',
  ink: 'bg-ink text-sheet border-ink',
  outline: 'bg-transparent text-ink border-ink',
}

const iconAccent: Record<BadgeTone, 'saffron' | 'teal' | 'sienna' | 'sandy'> = {
  saffron: 'saffron',
  teal: 'teal',
  sienna: 'sienna',
  sandy: 'sandy',
  ink: 'saffron',
  outline: 'saffron',
}

export default function Badge({ tone = 'saffron', icon, stamp = false, className, children }: BadgeProps) {
  if (stamp) {
    return (
      <span className={cn('inline-flex -rotate-6 items-center gap-1 border-4 border-double border-sienna-deep px-2.5 py-0.5 font-display text-sm tracking-wider text-sienna-deep uppercase', className)}>
        {children}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1 border-2 px-2 py-0.5 font-sans text-[0.68rem] leading-tight font-bold tracking-[0.12em] uppercase', tones[tone], className)}>
      {icon && <Icon name={icon} className="size-4" accent={iconAccent[tone]} />}
      {children}
    </span>
  )
}
