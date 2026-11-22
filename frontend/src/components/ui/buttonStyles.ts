import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

// Square, ruled buttons in the printed-menu style: 2px ink border, caps lettering, and a small
// press-down on click. Kept separate from Button.tsx so links can look like buttons too.
const base =
  'inline-flex items-center justify-center gap-2 font-sans font-bold uppercase tracking-[0.08em] text-center ' +
  'select-none transition-[background-color,color,transform] duration-150 ease-out ' +
  'disabled:cursor-not-allowed disabled:opacity-55'

const press = 'active:translate-x-px active:translate-y-px disabled:translate-0'

const variants: Record<ButtonVariant, string> = {
  // Saffron with ink lettering (6.0:1); inverts to ink on hover like a printed menu.
  primary: cn('border-2 border-ink bg-saffron text-ink hover:bg-ink hover:text-saffron disabled:hover:bg-saffron disabled:hover:text-ink', press),
  secondary: cn('border-2 border-ink sheet-grain text-ink hover:bg-saffron-soft disabled:hover:bg-sheet', press),
  // Ink with paper lettering (9.3:1).
  dark: cn('border-2 border-ink bg-ink text-sheet hover:bg-teal-deep disabled:hover:bg-ink', press),
  // Destructive: sienna rule and tint, ink lettering.
  danger: cn('border-2 border-sienna-deep bg-sienna-soft text-ink hover:bg-sienna hover:text-ink disabled:hover:bg-sienna-soft', press),
  ghost: 'border-2 border-transparent bg-transparent text-ink underline decoration-2 underline-offset-4 hover:decoration-sienna',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-xs',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
} = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}

/**
 * The arrow button: ONE ruled button with its label on the left and a ↗ glyph on the right. The
 * whole surface is the target and there is no inner divider, so it never reads as two buttons.
 *   <Link className={arrowButtonClasses({ tone: 'saffron' })}>
 *     <span className={arrowLabel}>Start exploring</span>
 *     <ArrowCell />
 *   </Link>
 * Tones: `sheet` (default, secondary), `saffron` (main call to action), `teal` and `sandy` for
 * shortcuts that sit near each other and need to look different. Filled tones invert to ink on
 * hover like the primary button; the glyph nudges toward where it goes.
 */
export type ArrowTone = 'sheet' | 'saffron' | 'teal' | 'sandy'

const arrowTones: Record<ArrowTone, string> = {
  sheet: 'sheet-grain text-ink hover:bg-saffron-soft',
  saffron: 'bg-saffron text-ink hover:bg-ink hover:text-saffron',
  teal: 'bg-teal-soft text-ink hover:bg-ink hover:text-teal-soft',
  sandy: 'bg-sandy-soft text-ink hover:bg-ink hover:text-sandy-soft',
}

const arrowBase =
  'group/arrow inline-flex items-stretch border-2 border-ink font-sans font-bold uppercase tracking-[0.08em] text-left ' +
  'cursor-pointer select-none transition-[background-color,color,box-shadow,transform] duration-200 ease-out ' +
  'active:translate-x-px active:translate-y-px active:shadow-none ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-55 disabled:cursor-not-allowed disabled:opacity-55'

const arrowSizes: Record<ButtonSize, string> = {
  sm: 'min-h-12 text-xs',
  md: 'min-h-12 text-sm',
  lg: 'min-h-16 text-base',
}

export function arrowButtonClasses({
  tone = 'sheet',
  size = 'md',
  fullWidth = false,
  className,
}: { tone?: ArrowTone; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(arrowBase, arrowTones[tone], arrowSizes[size], fullWidth && 'w-full', className)
}

/** The default (sheet) arrow button. Kept as a constant for existing call sites. */
export const arrowRowClasses = arrowButtonClasses()
export const arrowLabel = 'flex min-w-0 flex-1 items-center py-2 pl-4'
