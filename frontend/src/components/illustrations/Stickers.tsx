// Original hand-drawn style stickers: flat fills, thick wobbly navy strokes. Decorative only.
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

const stroke = {
  stroke: 'var(--color-navy)',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function Star({ className, fill = 'var(--color-sun)' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} aria-hidden>
      <path
        d="M24 4.5c1.6 5.2 3.1 9.6 5.4 11.6 2.6 1.3 7.4 1.4 13.6 1.9-4.3 3.6-8.5 6.6-9.5 9.4-.4 3 1.5 7.6 3.6 13.6-5.1-3-9.1-5.9-12.4-6-3.3.3-7.5 3.3-12.6 6.3 1.8-6 3.5-10.3 3.2-13.4-1.1-2.9-5.4-5.9-9.7-9.6 6.1-.3 10.9-.5 13.4-1.9 2.3-2.1 3.6-6.6 5-11.9Z"
        fill={fill}
        {...stroke}
      />
    </svg>
  )
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" preserveAspectRatio="none" className={cn('h-4 w-48', className)} aria-hidden>
      <path
        d="M4 14c12-9 20-9 28 0s17 10 27 1 19-10 28-1 18 9 28 0 19-10 28 0 17 9 27 0 18-8 26 0 14 7 20 2"
        fill="none"
        {...stroke}
        strokeWidth={5}
      />
    </svg>
  )
}

type BubbleProps = {
  children: ReactNode
  /** Which side the tail points to. */
  tail?: 'left' | 'right'
  fill?: 'paper' | 'bubble-light' | 'sun'
  className?: string
}

const bubbleFill = { paper: 'bg-paper', 'bubble-light': 'bg-bubble-light', sun: 'bg-sun' }
const tailFill = { paper: 'var(--color-paper)', 'bubble-light': 'var(--color-bubble-light)', sun: 'var(--color-sun)' }

// Speech bubble: the box is HTML (so text wraps), the tail is a small SVG.
export function SpeechBubble({ children, tail = 'left', fill = 'paper', className }: BubbleProps) {
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-[1.4rem_1.1rem_1.5rem_1.2rem] border-4 border-navy px-4 py-2 font-type text-navy uppercase',
          bubbleFill[fill],
        )}
      >
        {children}
      </div>
      <svg
        viewBox="0 0 30 24"
        className={cn('absolute -bottom-[18px] h-6 w-8', tail === 'left' ? 'left-6' : 'right-6 -scale-x-100')}
        aria-hidden
      >
        {/* Fill first, then stroke only the two outer edges so it joins the box seamlessly. */}
        <path d="M2 0 L4 20 L22 0 Z" fill={tailFill[fill]} />
        <path d="M2 1 L4 20 L22 1" fill="none" {...stroke} />
      </svg>
    </div>
  )
}
