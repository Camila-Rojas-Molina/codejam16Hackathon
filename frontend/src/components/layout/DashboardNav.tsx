// MIGO's main navigation: a left column on desktop, an icon rail on tablets, a tab bar on phones.
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useConversations } from '../../features/chat/useConversations'
import { useChallenges } from '../../features/quests/useChallenges'
import { cn } from '../../lib/cn'
import { ChatIcon, MapIcon, ProfileIcon, QuestIcon, ShopIcon } from '../illustrations/Icons'
import Logo from '../ui/Logo'

type Item = { to: string; label: string; icon: ReactNode; badge?: number; badgeLabel?: string }

function useNavItems(includeShop: boolean): Item[] {
  const { readyCount } = useChallenges()
  const unread = useConversations().reduce((n, c) => n + c.unread, 0)
  const items: Item[] = [
    { to: '/map', label: 'Map', icon: <MapIcon /> },
    { to: '/quests', label: 'Quests', icon: <QuestIcon />, badge: readyCount, badgeLabel: `${readyCount} reward${readyCount === 1 ? '' : 's'} to claim` },
    { to: '/chat', label: 'Chat', icon: <ChatIcon />, badge: unread, badgeLabel: `${unread} unread` },
    { to: '/profile', label: 'Profile', icon: <ProfileIcon /> },
  ]
  if (includeShop) items.push({ to: '/shop', label: 'Shop', icon: <ShopIcon /> })
  return items
}

function Badge({ count, label, className }: { count?: number; label?: string; className?: string }) {
  if (!count) return null
  return (
    <>
      <span className={cn('grid min-w-6 place-items-center rounded-full border-2 border-navy bg-red px-1.5 font-type text-xs text-white', className)} aria-hidden>
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
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh flex-col border-r-[3px] border-navy/25 px-3 py-6 md:flex lg:px-5">
      <NavLink to="/map" className="mb-8 flex justify-center lg:justify-start lg:px-3" aria-label="MIGO home">
        <Logo size="md" className="hidden lg:block" />
        <Logo size="md" variant="icon" className="lg:hidden" />
      </NavLink>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-14 items-center gap-4 rounded-2xl border-[3px] px-3 font-type tracking-wider uppercase transition-[transform,background-color] duration-150 active:scale-[0.97]',
                  'flex-col justify-center gap-1 text-[0.65rem] lg:flex-row lg:justify-start lg:text-base',
                  isActive ? 'border-navy bg-paper text-navy shadow-[3px_3px_0_var(--color-navy)]' : 'border-transparent text-navy hover:bg-bubble-light/70',
                )
              }
            >
              <span className="transition-transform group-hover:-rotate-6 [&_svg]:size-8">{item.icon}</span>
              <span className="lg:flex-1">{item.label}</span>
              {/* Count beside the label on desktop; pinned to the icon on the tablet rail. */}
              <Badge count={item.badge} label={item.badgeLabel} className="absolute top-1 right-2 lg:static" />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Phones (< md): a tab bar along the bottom. Shop gets a tab here because the sidebar is gone. */
export function MobileTabBar() {
  const items = useNavItems(true)
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto flex max-w-lg gap-1 rounded-[1.6rem] border-[3px] border-navy bg-paper p-1.5">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 font-type text-[0.6rem] tracking-wider uppercase transition-transform active:scale-95',
                  isActive ? 'border-navy bg-sun text-ink' : 'border-transparent text-navy',
                )
              }
            >
              <span className="[&_svg]:size-6">{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span className="absolute top-0.5 right-1.5">
                  <Badge count={item.badge} label={item.badgeLabel} />
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
