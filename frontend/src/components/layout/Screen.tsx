import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ScreenProps = {
  children: ReactNode
  /** Extra bottom room when a fixed BottomNav is shown. */
  withNav?: boolean
  className?: string
}

// Phone-width column with safe-area padding so nothing sits under the notch or home bar.
export default function Screen({ children, withNav = false, className }: ScreenProps) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-md flex-col px-5',
        'pt-[max(1.5rem,env(safe-area-inset-top))]',
        withNav ? 'pb-36' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </main>
  )
}
