// The account status row: current mode and points. Shown at the top of the right sidebar on
// desktop, and as a sticky top bar (with messages + settings shortcuts) on smaller screens.
import { Link } from 'react-router'
import { useConversations } from '../../features/chat/useConversations'
import ModeToggle from '../../features/profile/components/ModeToggle'
import PointsBadge from '../../features/rewards/PointsBadge'
import { cn } from '../../lib/cn'
import { ChatIcon, SettingsIcon, ShopIcon } from '../illustrations/Icons'
import Logo from '../ui/Logo'

export function SettingsButton({ className }: { className?: string }) {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      title="Settings"
      className={cn('grid size-11 shrink-0 place-items-center rounded-full text-navy transition-transform hover:rotate-45 active:scale-90 [&_svg]:size-7', className)}
    >
      <SettingsIcon />
    </Link>
  )
}

/** Desktop: mode + points, side by side. */
export function AccountStatus() {
  return (
    <div className="flex items-start gap-2">
      <ModeToggle showContext className="min-w-0 flex-1" />
      <PointsBadge />
    </div>
  )
}

/** Tablets and phones: logo, mode, points, and shortcuts to messages, shop (tablet) and settings. */
export function TopBar() {
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  const icon = 'relative grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-90 [&_svg]:size-7'
  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-navy/25 bg-sky/95 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-sm lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Link to="/map" aria-label="MIGO home" className="md:hidden">
          <Logo size="sm" variant="icon" />
        </Link>
        <ModeToggle compact className="sm:hidden" />
        <ModeToggle className="hidden sm:block" />
        <div className="ml-auto flex items-center gap-1">
          <PointsBadge compact />
          <Link to="/shop" aria-label="Shop" className={cn(icon, 'hidden md:grid')}>
            <ShopIcon />
          </Link>
          <Link to="/chat" aria-label={unread ? `Messages, ${unread} unread` : 'Messages'} className={icon}>
            <ChatIcon />
            {unread > 0 && <span className="absolute top-1 right-1 size-3 rounded-full border-2 border-navy bg-red" aria-hidden />}
          </Link>
          <SettingsButton />
        </div>
      </div>
    </header>
  )
}
