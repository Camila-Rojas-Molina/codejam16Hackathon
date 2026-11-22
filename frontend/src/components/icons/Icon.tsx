// MIGO's icon set: original retro line icons on a 24×24 grid, one consistent style throughout:
// a 1.8px ink outline with round joins, plus a flat accent fill (saffron by default) like the
// printed-menu references. These replace every emoji in the interface.
//
// <Icon name="pin" />                     decorative (hidden from screen readers)
// <Icon name="pin" label="Location" />    meaningful on its own (announced)
// <Icon name="pin" accent="teal" />       accent fill: saffron | teal | sienna | sandy | sheet | none
import { cn } from '../../lib/cn'
import { ICONS, type IconName } from './iconPaths'
import { BRIGHT_ACCENTS, LINE_ONLY_ICONS } from './iconSets'

export type { IconName }

export type IconAccent = 'saffron' | 'teal' | 'sienna' | 'sandy' | 'sheet' | 'none'

const accents: Record<IconAccent, string> = {
  saffron: 'var(--color-saffron)',
  teal: 'var(--color-teal)',
  sienna: 'var(--color-sienna)',
  sandy: 'var(--color-sandy)',
  sheet: 'var(--color-sheet)',
  none: 'none',
}

type IconProps = {
  name: IconName
  /** Announced to screen readers. Omit when the icon sits next to text that says the same thing. */
  label?: string
  accent?: IconAccent
  className?: string
  strokeWidth?: number
}

export default function Icon({ name, label, accent = 'saffron', className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6 shrink-0', BRIGHT_ACCENTS.has(accent) && !LINE_ONLY_ICONS.has(name) && 'icon-bright', className)}
      style={{ ['--icon-accent' as string]: accents[accent] }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}
