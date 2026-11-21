import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'sun' | 'ghost'
export type ButtonSize = 'md' | 'lg'

// Kept separate from Button.tsx so links (<Link className={buttonClasses(...)}>) can look like buttons.
// Fat pills, typewriter caps, squish when pressed.
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-type uppercase tracking-wider ' +
  'select-none transition-transform duration-100 ease-out ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const squish = 'active:scale-x-[1.04] active:scale-y-[0.9] disabled:scale-100'

const variants: Record<ButtonVariant, string> = {
  // Two-tone: darker red fill sitting inside a lighter red-rim border. White on red = 4.7:1.
  primary: cn('border-4 border-red-rim bg-red text-white', squish),
  secondary: cn('border-[3px] border-navy bg-paper text-navy', squish),
  // For points / success moments. Ink on sun = 13.9:1.
  sun: cn('border-[3px] border-navy bg-sun text-ink', squish),
  // Navy on sky = 5.1:1.
  ghost: 'border-transparent bg-transparent text-navy underline-offset-4 hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12 px-6 text-base',
  lg: 'min-h-16 px-8 text-xl',
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
