import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import { CountBadge, NavIcon } from '../layout/DashboardNav'
import { useNavItems } from '../layout/navItems'

type BottomNavProps = {
  className?: string
}

// Floating tab bar for the full-screen flows outside the dashboard (hunts): the same five main
// destinations as the dashboard nav, as a row of ruled cells, the active one filled saffron.
export default function BottomNav({ className }: BottomNavProps) {
  const items = useNavItems()
  return (
    <nav
      aria-label="Main"
      className={cn('fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]', className)}
    >
      <ul className="sheet-grain flex border-2 border-ink shadow-block-sm">
        {items.map((item, i) => (
          <li key={item.to} className={cn('min-w-0 flex-1', i > 0 && 'border-l-2 border-ink')}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6rem] font-bold tracking-[0.08em] uppercase transition-colors',
                  isActive ? 'bg-saffron text-ink' : 'text-ink hover:bg-saffron-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon icon={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-6" />
                  <span>{item.label}</span>
                  <CountBadge count={item.badge} label={item.badgeLabel} className="absolute top-0.5 right-0.5 min-w-5 text-[0.6rem]" />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
