// The account status row: current mode and points. Shown at the top of the right sidebar on
// desktop, and as a sticky top bar (with messages + settings shortcuts) on smaller screens.
import { Link } from 'react-router'
import { useConversations } from '../../features/chat/useConversations'
import ModeToggle, { ModeContext } from '../../features/profile/components/ModeToggle'
import PointsBadge from '../../features/rewards/PointsBadge'
import { cn } from '../../lib/cn'
import Icon from '../icons/Icon'
import Logo from '../ui/Logo'

const iconButton =
  'relative grid size-11 shrink-0 place-items-center border-2 border-ink bg-sheet transition-colors hover:bg-saffron active:translate-x-px active:translate-y-px'

export function SettingsButton({ className }: { className?: string }) {
  return (
    <Link to="/settings" aria-label="Settings" title="Settings" className={cn(iconButton, 'group', className)}>
      <Icon name="cog" className="size-6 transition-transform duration-300 group-hover:rotate-45" />
    </Link>
  )
}

/** Desktop: the mode toggle across the top, then what it's pointed at and the points balance. */
export function AccountStatus() {
  return (
    <div className="space-y-3">
      <ModeToggle />
      <div className="flex items-center justify-between gap-3">
        <ModeContext />
        <PointsBadge />
      </div>
    </div>
  )
}

/** Tablets and phones: logo, mode, points, and shortcuts to messages, shop (tablet) and settings. */
export function TopBar() {
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  return (
    <header className="sheet-grain sticky top-0 z-20 border-b-2 border-ink px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {/* Below 360px there isn't room for the logo as well; Map is in the bottom tab bar. */}
        <Link to="/map" aria-label="MIGO home" className="max-[359px]:hidden md:hidden">
          <Logo size="sm" variant="icon" />
        </Link>
        <ModeToggle compact className="sm:hidden" />
        <ModeToggle className="hidden sm:block" />
        <div className="ml-auto flex items-center gap-1.5">
          <PointsBadge compact />
          <Link to="/shop" aria-label="Shop" className={cn(iconButton, 'hidden md:grid')}>
            <Icon name="shop" className="size-6" />
          </Link>
          <Link to="/chat" aria-label={unread ? `Messages, ${unread} unread` : 'Messages'} className={iconButton}>
            <Icon name="chat" className="size-6" />
            {unread > 0 && <span className="absolute -top-1.5 -right-1.5 size-3.5 border-2 border-ink bg-sienna" aria-hidden />}
          </Link>
          <SettingsButton />
        </div>
      </div>
    </header>
  )
}
