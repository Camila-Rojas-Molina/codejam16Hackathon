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
 * The menu "price row" button: a label cell joined to a saffron ↗ cell. Wrap the label in
 * <span className={arrowLabel}> and add <ArrowCell /> after it.
 */
export const arrowRowClasses =
  'group/arrow inline-flex min-h-12 items-stretch border-2 border-ink sheet-grain text-ink font-sans font-bold uppercase tracking-[0.08em] text-sm ' +
  'transition-colors hover:bg-saffron-soft active:translate-x-px active:translate-y-px'
export const arrowLabel = 'flex flex-1 items-center px-4'
