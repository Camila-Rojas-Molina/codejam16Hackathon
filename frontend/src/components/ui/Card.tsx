import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardTone = 'sheet' | 'paper' | 'saffron' | 'saffron-soft' | 'teal-soft' | 'sandy-soft' | 'sienna-soft' | 'ink'

type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string
  tone?: CardTone
  /** Solid offset shadow, for the one card on a screen that should lift off the page. */
  lifted?: boolean
  /** Tighter padding for dense cells. */
  compact?: boolean
  children: ReactNode
}

// A ruled cell: square corners, 2px ink border, paper fill. Every container uses this look.
const tones: Record<CardTone, string> = {
  sheet: 'sheet-grain text-ink',
  paper: 'paper-grain text-ink',
  saffron: 'bg-saffron text-ink',
  'saffron-soft': 'bg-saffron-soft text-ink',
  'teal-soft': 'bg-teal-soft text-ink',
  'sandy-soft': 'bg-sandy-soft text-ink',
  'sienna-soft': 'bg-sienna-soft text-ink',
  ink: 'bg-ink text-sheet',
}

export default function Card({ title, tone = 'sheet', lifted, compact, className, children, ...props }: CardProps) {
  return (
    <section className={cn('border-2 border-ink', compact ? 'p-4' : 'p-5 sm:p-6', tones[tone], lifted && 'shadow-block', className)} {...props}>
      {title && <h2 className="mb-3 text-2xl">{title}</h2>}
      {children}
    </section>
  )
}
