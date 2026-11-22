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

/** The saffron ↗ cell at the end of an arrow-row link or button. */
export function ArrowCell({ icon = 'arrow-up-right' }: { icon?: IconName }) {
  return (
    <span className="grid w-12 shrink-0 place-items-center border-l-2 border-ink bg-saffron transition-colors group-hover/arrow:bg-ink group-hover/arrow:text-saffron" aria-hidden>
      <Icon name={icon} className="size-5" accent="none" strokeWidth={2.2} />
    </span>
  )
}
