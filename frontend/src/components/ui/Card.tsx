import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardProps = {
  title?: string
  className?: string
  children: ReactNode
}

export default function Card({ title, className, children }: CardProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm', className)}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  )
}
