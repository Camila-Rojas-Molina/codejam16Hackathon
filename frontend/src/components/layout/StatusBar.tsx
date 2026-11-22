// The account status: current mode, what it's pointed at, and the points balance (which opens the
// shop). Shown at the top of the right sidebar on wide desktops, and as a sticky top bar on
// everything narrower.
import { Link } from 'react-router'
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

/** Wide desktop sidebar: the mode toggle across the top, what it's pointed at, then the balance. */
export function AccountStatus() {
  return (
    <div className="space-y-3">
      <ModeToggle />
      <ModeContext />
      <PointsBadge className="w-full" />
    </div>
  )
}

/**
 * Phones, tablets and small laptops: logo (where there's no side nav), mode, points → shop and
 * settings. Messages are in the main nav everywhere, so they don't need a shortcut here.
 */
export function TopBar() {
  return (
    <header className="sheet-grain sticky top-0 z-20 border-b-2 border-ink px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-6 xl:hidden">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Below 380px there isn’t room for the logo as well; Map is in the bottom tab bar. */}
        <Link to="/map" aria-label="MIGO home" className="shrink-0 max-[379px]:hidden md:hidden">
          <Logo size="sm" variant="icon" />
        </Link>
        <ModeToggle compact className="sm:hidden" />
        <ModeToggle className="hidden w-64 sm:block" />
        <div className="hidden min-w-0 lg:block">
          <ModeContext />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex sm:hidden">
            <PointsBadge compact />
          </div>
          <div className="hidden sm:flex">
            <PointsBadge />
          </div>
          <SettingsButton />
        </div>
      </div>
    </header>
  )
}
