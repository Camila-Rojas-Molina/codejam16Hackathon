// Decorative print details, all original art and all decorative (hidden from screen readers):
// starbursts, sparkles, brush swatches and tape from the café poster, plus the squiggle and
// speech bubble used around the hunt screens.
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'saffron' | 'teal' | 'sienna' | 'sandy' | 'teal-soft' | 'saffron-soft'
const fill = (tone: Tone) => `var(--color-${tone})`

/** A jagged starburst, like the shapes behind the café-poster mascot. */
export function Starburst({ className, tone = 'sienna', points = 14, style }: { className?: string; tone?: Tone; points?: number; style?: CSSProperties }) {
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 26 + ((i * 7) % 5) * 2.5
    const a = (Math.PI * i) / points - Math.PI / 2
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" className={cn('size-40', className)} style={style} aria-hidden>
      <polygon points={d} fill={fill(tone)} />
    </svg>
  )
}

/** Four-point sparkle, outlined. */
export function Sparkle({ className, tone = 'saffron' }: { className?: string; tone?: Tone }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-6', className)} aria-hidden>
      <path d="M12 2c.9 5.3 2.7 7.1 8 8-5.3.9-7.1 2.7-8 8-.9-5.3-2.7-7.1-8-8 5.3-.9 7.1-2.7 8-8z" fill={fill(tone)} stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** Five-point star sticker. */
export function Star({ className, tone = 'saffron' }: { className?: string; tone?: Tone }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} aria-hidden>
      <path
        d="M24 4.5c1.6 5.2 3.1 9.6 5.4 11.6 2.6 1.3 7.4 1.4 13.6 1.9-4.3 3.6-8.5 6.6-9.5 9.4-.4 3 1.5 7.6 3.6 13.6-5.1-3-9.1-5.9-12.4-6-3.3.3-7.5 3.3-12.6 6.3 1.8-6 3.5-10.3 3.2-13.4-1.1-2.9-5.4-5.9-9.7-9.6 6.1-.3 10.9-.5 13.4-1.9 2.3-2.1 3.6-6.6 5-11.9Z"
        fill={fill(tone)}
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A dry-brush paint swatch to sit behind a card. */
export function BrushSwatch({ className, tone = 'teal-soft' }: { className?: string; tone?: Tone }) {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none" className={cn('block h-28', className)} aria-hidden>
      <path
        d="M8 30c40-10 110-14 180-12 70 2 140-6 200 4 6 8-8 14-2 22 8 10-4 18 2 28 6 12-10 18-30 22-60 10-150 6-220 10-50 3-100 6-128-6-8-6 4-14-2-22-8-10 6-16 0-26C2 44 0 36 8 30z"
        fill={fill(tone)}
      />
      <path d="M30 14h60M120 10h40M300 108h50M60 112h30" stroke={fill(tone)} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

/** A strip of masking tape, for pinning cards and photos. */
export function Tape({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn('pointer-events-none absolute block h-6 w-20 bg-saffron-soft/80 [clip-path:polygon(3%_8%,97%_0,100%_92%,0_100%)]', className)}
    />
  )
}

/** Wavy underline. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" preserveAspectRatio="none" className={cn('h-4 w-48', className)} aria-hidden>
      <path
        d="M4 14c12-9 20-9 28 0s17 10 27 1 19-10 28-1 18 9 28 0 19-10 28 0 17 9 27 0 18-8 26 0 14 7 20 2"
        fill="none"
        stroke="var(--color-sienna)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

type BubbleProps = {
  children: ReactNode
  /** Which side the tail points to. */
  tail?: 'left' | 'right'
  tone?: 'sheet' | 'saffron' | 'teal-soft'
  className?: string
}

const bubbleFill = { sheet: 'bg-sheet', saffron: 'bg-saffron', 'teal-soft': 'bg-teal-soft' }
const tailFill = { sheet: 'var(--color-sheet)', saffron: 'var(--color-saffron)', 'teal-soft': 'var(--color-teal-soft)' }

/** Outlined speech bubble with serif lettering. */
export function SpeechBubble({ children, tail = 'left', tone = 'sheet', className }: BubbleProps) {
  return (
    <div className={cn('relative', className)}>
      <div className={cn('rounded-[1.4rem] border-2 border-ink px-4 py-2 font-serif text-lg text-ink', bubbleFill[tone])}>{children}</div>
      <svg viewBox="0 0 30 24" className={cn('absolute -bottom-[17px] h-6 w-8', tail === 'left' ? 'left-6' : 'right-6 -scale-x-100')} aria-hidden>
        <path d="M2 0 L4 20 L22 0 Z" fill={tailFill[tone]} />
        <path d="M2 1 L4 20 L22 1" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
