import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ScreenProps = {
  children: ReactNode
  /** Extra bottom room when a fixed BottomNav is shown. */
  withNav?: boolean
  className?: string
}

// A single printed sheet: edge to edge on phones; on larger screens a framed, ruled page with a
// block shadow, centred on the paper background. Safe-area padding keeps clear of notches.
export default function Screen({ children, withNav = false, className }: ScreenProps) {
  return (
    <div className="min-h-dvh md:px-6 md:py-10">
      <main
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 md:min-h-[calc(100dvh-5rem)]',
          'md:sheet-grain md:border-2 md:border-ink md:px-8 md:shadow-block',
          'pt-[max(1.5rem,env(safe-area-inset-top))]',
          withNav ? 'pb-36' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          className,
        )}
      >
        {children}
      </main>
    </div>
  )
}
