import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'

type TimerSize = 'sm' | 'lg'

type TimerProps = {
  /** Seconds remaining. The parent owns the countdown; Timer only displays it. */
  seconds: number
  /** At or below this many seconds the timer switches to the urgent red state. */
  urgentBelow?: number
  size?: TimerSize
  className?: string
}

const sizes: Record<TimerSize, string> = {
  sm: 'px-4 py-1 text-xl rounded-full',
  lg: 'px-7 py-2 text-5xl rounded-full',
}

export default function Timer({ seconds, urgentBelow = 60, size = 'lg', className }: TimerProps) {
  const remaining = Math.max(0, Math.ceil(seconds))
  // Under a minute it turns red: red fill + white typewriter digits (4.7:1). Never red text on sky.
  const urgent = remaining < urgentBelow
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  return (
    <div
      role="timer"
      aria-label={`${mm} minutes ${ss} seconds left`}
      className={cn(
        'inline-flex items-center border-4 font-type tabular-nums transition-colors',
        sizes[size],
        urgent
          ? 'border-red-rim bg-red text-white motion-safe:animate-tick'
          : 'border-navy bg-paper text-navy',
        className,
      )}
    >
      {formatClock(remaining)}
    </div>
  )
}
