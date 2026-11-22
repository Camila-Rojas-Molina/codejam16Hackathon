// MIGO's main navigation: a ruled left column on desktop, an icon rail on tablets, a tab bar on
// phones. Each item is a cell divided by ink rules; the current one is filled saffron.
// Same five destinations, in the same order, everywhere: Map, Quests, Chat, Profile, Gallery.
// (The shop is reached from the points balance, and from the sidebar on desktop.)
import { NavLink } from 'react-router'
import { useConversations } from '../../features/chat/useConversations'
import { useChallenges } from '../../features/quests/useChallenges'
import { cn } from '../../lib/cn'
import Icon, { type IconAccent, type IconName } from '../icons/Icon'
import MascotIcon from '../icons/MascotIcon'
import Logo from '../ui/Logo'

export type NavItem = { to: string; label: string; icon: IconName | 'mascot'; badge?: number; badgeLabel?: string }

/** The main destinations with their live counts (rewards to claim, unread messages). */
export function useNavItems(): NavItem[] {
  const { readyCount } = useChallenges()
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  return [
    { to: '/map', label: 'Map', icon: 'mascot' },
    { to: '/quests', label: 'Quests', icon: 'quest', badge: readyCount, badgeLabel: `${readyCount} reward${readyCount === 1 ? '' : 's'} to claim` },
    { to: '/chat', label: 'Chat', icon: 'chats', badge: unread, badgeLabel: `${unread} unread` },
    { to: '/profile', label: 'Profile', icon: 'smile' },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
  ]
}

/** A nav item's icon: Migo for the map, a line icon for the rest. */
export function NavIcon({ icon, accent, className }: { icon: NavItem['icon']; accent: IconAccent; className?: string }) {
  return icon === 'mascot' ? <MascotIcon accent={accent} className={className} /> : <Icon name={icon} accent={accent} className={className} />
}

/** Count badge: ink square, paper digits (9.3:1), with a sienna corner. */
export function CountBadge({ count, label, className }: { count?: number; label?: string; className?: string }) {
  if (!count) return null
  return (
    <>
      <span className={cn('grid min-w-6 place-items-center border-2 border-ink bg-ink px-1 text-xs font-bold text-sheet shadow-[2px_2px_0_var(--color-sienna)]', className)} aria-hidden>
        {count}
      </span>
      <span className="sr-only">, {label}</span>
    </>
  )
}

/** Desktop column (lg+) and tablet rail (md). */
export function SideNav() {
  const items = useNavItems()
  return (
    <nav aria-label="Main" className="sheet-grain sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r-2 border-ink md:flex">
      <NavLink to="/map" className="grid h-24 shrink-0 place-items-center px-4 lg:h-28" aria-label="MIGO home">
        <Logo size="md" className="hidden lg:block" />
        <Logo size="md" variant="icon" className="lg:hidden" />
      </NavLink>
      <div className="hatch-band" aria-hidden />
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.to} className="border-b-2 border-ink">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-[4.5rem] items-center gap-4 px-2 font-bold tracking-[0.12em] uppercase transition-colors',
                  'flex-col justify-center gap-1 text-[0.62rem] lg:min-h-16 lg:flex-row lg:justify-start lg:px-6 lg:text-sm',
                  isActive ? 'bg-saffron' : 'hover:bg-saffron-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon icon={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-8 transition-transform group-hover:-rotate-6" />
                  <span className="lg:flex-1">{item.label}</span>
                  <CountBadge count={item.badge} label={item.badgeLabel} className="absolute top-2 right-2 lg:static" />
                  {isActive && <Icon name="arrow-right" accent="none" strokeWidth={2.4} className="hidden size-5 lg:block" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Phones (< md): a ruled tab bar along the bottom. Also used under the full-screen flows (hunts). */
export function MobileTabBar({ className }: { className?: string }) {
  const items = useNavItems()
  return (
    <nav aria-label="Main" className={cn('fixed inset-x-0 bottom-0 z-30 md:hidden', className)}>
      <ul className="sheet-grain flex border-t-2 border-ink pb-[env(safe-area-inset-bottom)]">
        {items.map((item, i) => (
          <li key={item.to} className={cn('min-w-0 flex-1', i > 0 && 'border-l-2 border-ink')}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6rem] font-bold tracking-[0.08em] uppercase transition-colors',
                  isActive ? 'bg-saffron' : 'hover:bg-saffron-soft active:bg-saffron-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon icon={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-7" />
                  {item.label}
                  <CountBadge count={item.badge} label={item.badgeLabel} className="absolute top-1 right-1 min-w-5 text-[0.6rem]" />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
