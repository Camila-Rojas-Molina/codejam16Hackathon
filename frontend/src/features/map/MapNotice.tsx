// Small ruled notes on top of the map (or above the list): load errors with a retry, the offline
// catalogue, location messages. Errors are announced; the rest are polite status updates.
import type { ReactNode } from 'react'
import Icon, { type IconName } from '../../components/icons/Icon'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/cn'

type Props = {
  icon?: IconName
  tone?: 'info' | 'error'
  children: ReactNode
  action?: { label: string; onClick: () => void }
  onDismiss?: () => void
  className?: string
}

export default function MapNotice({ icon = 'info', tone = 'info', children, action, onDismiss, className }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 border-2 border-ink p-2 pl-3 text-sm shadow-block-sm', tone === 'error' ? 'bg-sienna-soft' : 'sheet-grain', className)}
    >
      <Icon name={tone === 'error' ? 'alert' : icon} accent={tone === 'error' ? 'sienna' : 'saffron'} className="mt-2.5 size-5" />
      <div className="min-w-0 flex-1 py-2.5 leading-snug">{children}</div>
      {action && (
        <Button variant="secondary" size="sm" className="mt-0.5 min-h-11" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-11 shrink-0 place-items-center">
          <Icon name="close" accent="none" className="size-4" />
        </button>
      )}
    </div>
  )
}
