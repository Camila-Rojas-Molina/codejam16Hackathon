import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'sun' | 'bubble' | 'bubble-light' | 'red' | 'navy' | 'outline'

type BadgeProps = {
  tone?: BadgeTone
  /** Rubber-stamp look for completed hunts: tilted, double border, distressed caps. */
  stamp?: boolean
  className?: string
  children: ReactNode
}

// Every pairing here is >= 4.5:1 (white on red is 4.7:1, the lowest).
const tones: Record<BadgeTone, string> = {
  sun: 'bg-sun text-ink',
  bubble: 'bg-bubble text-navy',
  'bubble-light': 'bg-bubble-light text-navy',
  red: 'bg-red text-white',
  navy: 'bg-navy text-white',
  outline: 'bg-transparent text-navy',
}

export default function Badge({ tone = 'sun', stamp = false, className, children }: BadgeProps) {
  if (stamp) {
    return (
      <span
        className={cn(
          'inline-flex -rotate-6 items-center gap-1 rounded-lg border-4 border-double border-navy px-2.5 py-0.5',
          'font-display text-sm tracking-wider text-navy uppercase',
          className,
        )}
      >
        {children}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-2 border-navy px-3 py-0.5 font-type text-xs tracking-wider uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
