import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type PageHeaderProps = {
  title: string
  /** Small caps line above the title. */
  eyebrow?: string
  description?: ReactNode
  /** Right-hand slot (a balance, a button…). */
  aside?: ReactNode
  className?: string
}

/** Page masthead: eyebrow, a big Montserrat headline, a line of copy, then a hatched rule. */
export default function PageHeader({ title, eyebrow, description, aside, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-2', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="text-4xl break-words sm:text-5xl">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-base">{description}</div>}
        </div>
        {aside}
      </div>
      <div className="hatch-band" aria-hidden />
    </header>
  )
}
