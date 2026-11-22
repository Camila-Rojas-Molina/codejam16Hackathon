import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'

type TimerSize = 'sm' | 'lg'

type TimerProps = {
  /** Seconds remaining. The parent owns the countdown; Timer only displays it. */
  seconds: number
  /** At or below this many seconds the timer switches to its urgent (saffron, ticking) state. */
  urgentBelow?: number
  size?: TimerSize
  className?: string
}

const sizes: Record<TimerSize, string> = {
  sm: 'px-4 py-1 text-xl',
  lg: 'px-7 py-2 text-5xl',
}

export default function Timer({ seconds, urgentBelow = 60, size = 'lg', className }: TimerProps) {
  const remaining = Math.max(0, Math.ceil(seconds))
    const urgent = remaining < urgentBelow
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  return (
    <div
      role="timer"
      aria-label={`${mm} minutes ${ss} seconds left`}
      className={cn(
        'inline-flex items-center border-2 border-ink font-display tabular-nums transition-colors',
        sizes[size],
        // Under a minute: saffron fill with ink digits (6.0:1), ticking.
        urgent ? 'bg-saffron text-ink shadow-block-sm motion-safe:animate-tick' : 'sheet-grain text-ink',
        className,
      )}
    >
      {formatClock(remaining)}
    </div>
  )
}
