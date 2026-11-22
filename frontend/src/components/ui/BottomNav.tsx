import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import Icon, { type IconName } from '../icons/Icon'

type Tab = { to: string; label: string; icon: IconName }

const tabs: Tab[] = [
  { to: '/hunts', label: 'Hunts', icon: 'map' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

type BottomNavProps = {
  className?: string
}

// Bottom tab bar for the hunt screens: a row of ruled cells, the active one filled saffron.
export default function BottomNav({ className }: BottomNavProps) {
  return (
    <nav
      aria-label="Hunt"
      className={cn('fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]', className)}
    >
      <ul className="sheet-grain flex border-2 border-ink shadow-block-sm">
        {tabs.map((tab, i) => (
          <li key={tab.to} className={cn('flex-1', i > 0 && 'border-l-2 border-ink')}>
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-bold tracking-[0.1em] uppercase transition-colors',
                  isActive ? 'bg-saffron text-ink' : 'text-ink hover:bg-saffron-soft',
                )
              }
            >
              <Icon name={tab.icon} accent="sheet" />
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
