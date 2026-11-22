// MIGO's main navigation: a ruled left column on desktop, an icon rail on tablets, a tab bar on
// phones. Each item is a cell divided by ink rules; the current one is filled saffron.
import { NavLink } from 'react-router'
import { useConversations } from '../../features/chat/useConversations'
import { useChallenges } from '../../features/quests/useChallenges'
import { cn } from '../../lib/cn'
import Icon, { type IconName } from '../icons/Icon'
import Logo from '../ui/Logo'

type Item = { to: string; label: string; icon: IconName; badge?: number; badgeLabel?: string }

function useNavItems(includeShop: boolean): Item[] {
  const { readyCount } = useChallenges()
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  const items: Item[] = [
    { to: '/map', label: 'Map', icon: 'globe' },
    { to: '/quests', label: 'Quests', icon: 'quest', badge: readyCount, badgeLabel: `${readyCount} reward${readyCount === 1 ? '' : 's'} to claim` },
    { to: '/chat', label: 'Chat', icon: 'chats', badge: unread, badgeLabel: `${unread} unread` },
    { to: '/profile', label: 'Profile', icon: 'smile' },
  ]
  if (includeShop) items.push({ to: '/shop', label: 'Shop', icon: 'shop' })
  return items
}

/** Count badge: ink square, paper digits (9.3:1), with a sienna corner. */
function CountBadge({ count, label, className }: { count?: number; label?: string; className?: string }) {
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
  const items = useNavItems(false)
  return (
    <nav aria-label="Main" className="sheet-grain sticky top-0 hidden h-dvh flex-col border-r-2 border-ink md:flex">
      <NavLink to="/map" className="grid h-24 place-items-center px-4 lg:h-28" aria-label="MIGO home">
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
                  'group relative flex min-h-16 items-center gap-4 px-3 font-bold tracking-[0.12em] uppercase transition-colors',
                  'flex-col justify-center gap-1 text-[0.62rem] lg:flex-row lg:justify-start lg:px-6 lg:text-sm',
                  isActive ? 'bg-saffron' : 'hover:bg-saffron-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-8 transition-transform group-hover:-rotate-6" />
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

/** Phones (< md): a ruled tab bar along the bottom. Shop gets a tab here because the sidebar is gone. */
export function MobileTabBar() {
  const items = useNavItems(true)
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <ul className="sheet-grain flex border-t-2 border-ink pb-[env(safe-area-inset-bottom)]">
        {items.map((item, i) => (
          <li key={item.to} className={cn('flex-1', i > 0 && 'border-l-2 border-ink')}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.58rem] font-bold tracking-[0.1em] uppercase transition-colors',
                  isActive ? 'bg-saffron' : 'hover:bg-saffron-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-6" />
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
