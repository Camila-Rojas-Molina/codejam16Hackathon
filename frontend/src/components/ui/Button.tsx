import type { ButtonHTMLAttributes } from 'react'
import Icon, { type IconName } from '../icons/Icon'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** Icon before the label. */
  icon?: IconName
}

export default function Button({ variant, size, fullWidth, className, icon, type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {icon && <Icon name={icon} className="size-5" accent={variant === 'primary' ? 'sheet' : 'saffron'} />}
      {children}
    </button>
  )
}

/**
 * The ↗ at the end of an arrow button (see arrowButtonClasses). Just the glyph, in the button's own
 * colours: no divider or separate fill, so the whole control reads as one button. It nudges toward
 * where it goes when the button is hovered or focused.
 */
export function ArrowCell({ icon = 'arrow-up-right' }: { icon?: IconName }) {
  return (
    <span className="grid w-12 shrink-0 place-items-center pr-1" aria-hidden>
      <Icon
        name={icon}
        className="size-5 transition-transform duration-200 ease-out group-hover/arrow:translate-x-0.5 group-hover/arrow:-translate-y-0.5 group-focus-visible/arrow:translate-x-0.5 group-focus-visible/arrow:-translate-y-0.5"
        accent="none"
        strokeWidth={2.2}
      />
    </span>
  )
}
