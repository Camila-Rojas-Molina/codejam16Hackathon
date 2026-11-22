// Navigation for the pages outside the dashboard (AppShell: the old scaffold pages and 404).
// Same five main destinations as the dashboard: a top bar from tablets up, the tab bar on phones.
import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import Logo from '../ui/Logo'
import { MobileTabBar, NavIcon } from './DashboardNav'
import { useNavItems } from './navItems'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center gap-2 border-2 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors',
    isActive ? 'border-ink bg-saffron text-ink' : 'border-transparent text-ink hover:bg-saffron-soft',
  )

export default function Navigation() {
  const items = useNavItems()
  return (
    <>
      <header className="sheet-grain sticky top-0 z-10 hidden border-b-2 border-ink md:block">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <NavLink to="/map" aria-label="MIGO home">
            <Logo size="sm" />
          </NavLink>
          <ul className="flex gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <NavIcon icon={item.icon} accent={isActive ? 'sheet' : 'saffron'} className="size-6" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <MobileTabBar />
    </>
  )
}
