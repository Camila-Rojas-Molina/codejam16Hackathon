// Hand-drawn style icons for the dashboard navigation and status bar. Original art, decorative.
import { cn } from '../../lib/cn'

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
type IconProps = { className?: string }
const box = (className?: string) => ({ viewBox: '0 0 32 32', className: cn('size-7 shrink-0', className), 'aria-hidden': true as const })

/** Globe with a little continent. */
export function MapIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <circle cx="16" cy="16" r="12.5" fill="var(--color-bubble)" stroke="var(--color-navy)" strokeWidth="2.4" />
      <path d="M8 11c3 0 4 2 6 2s2 3 0 4-1 4 1 5M19 6c-1 2 0 4 2 4s4 1 4 3" {...line} stroke="var(--color-navy)" />
      <path d="M17 22c2-1 4 0 5 2" {...line} stroke="var(--color-navy)" />
    </svg>
  )
}

/** Treasure map with a dotted trail and an X. */
export function QuestIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M4 7.5 11 5l10 2.5 7-2.5v19.5l-7 2.5-10-2.5L4 27Z" fill="var(--color-paper)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8 21c2-4 5-1 7-4s4-3 6-5" {...line} stroke="var(--color-navy)" strokeDasharray="1.5 3.2" />
      <path d="M21.5 9.5l3.5 3.5M25 9.5l-3.5 3.5" {...line} stroke="var(--color-red)" strokeWidth="2.8" />
    </svg>
  )
}

/** Two overlapping speech bubbles. */
export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M12 6h13a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-2v4l-5-4h-6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" fill="var(--color-bubble-light)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M5 12h4v6a3 3 0 0 0 3 3h3v1a3 3 0 0 1-3 3H9l-4 3v-3a3 3 0 0 1-2-3v-7a3 3 0 0 1 2-3Z" fill="var(--color-sun)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}

/** A smiley. */
export function ProfileIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <circle cx="16" cy="16" r="12.5" fill="var(--color-sun)" stroke="var(--color-navy)" strokeWidth="2.4" />
      <circle cx="12" cy="13.5" r="1.6" fill="var(--color-navy)" />
      <circle cx="20" cy="13.5" r="1.6" fill="var(--color-navy)" />
      <path d="M10.5 18.5c3 3.5 8 3.5 11 0" {...line} stroke="var(--color-navy)" />
    </svg>
  )
}

/** A little shop with a striped awning. */
export function ShopIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M6 14v13h20V14" fill="var(--color-paper)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M4 9l3-5h18l3 5v2a3.5 3.5 0 0 1-6 2.4 3.5 3.5 0 0 1-6 0 3.5 3.5 0 0 1-6 0A3.5 3.5 0 0 1 4 11Z" fill="var(--color-red)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M13 27v-7h6v7" fill="var(--color-bubble)" stroke="var(--color-navy)" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}

/** Cog. */
export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path
        d="M16 3.5l2.2 2.8 3.5-.9.9 3.5 3.4 1.2-1 3.4 2.5 2.5-2.5 2.5 1 3.4-3.4 1.2-.9 3.5-3.5-.9L16 28.5l-2.2-2.8-3.5.9-.9-3.5-3.4-1.2 1-3.4L4.5 16 7 13.5l-1-3.4 3.4-1.2.9-3.5 3.5.9Z"
        fill="var(--color-paper)"
        stroke="var(--color-navy)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.5" fill="var(--color-bubble)" stroke="var(--color-navy)" strokeWidth="2.2" />
    </svg>
  )
}

/** A MIGO points coin: sun-yellow with a star. */
export function PointsIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <circle cx="16" cy="16" r="12.5" fill="var(--color-sun)" stroke="var(--color-navy)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--color-navy)" strokeWidth="1.6" strokeDasharray="2 2.4" />
      <path d="M16 10.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5Z" fill="var(--color-red)" stroke="var(--color-navy)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
