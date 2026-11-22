import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import Logo from '../ui/Logo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/quests', label: 'Quests' },
  { to: '/map', label: 'Map' },
  { to: '/team', label: 'Team' },
  { to: '/dogs', label: 'Dogs' },
  { to: '/accessibility', label: 'Accessible' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block border-2 px-3 py-2 text-xs font-bold tracking-[0.1em] uppercase transition-colors',
    isActive ? 'border-ink bg-saffron text-ink' : 'border-transparent text-ink hover:bg-saffron-soft',
  )

// Phones: a ruled grid of cells (three across, two rows; one row from 640px), so every link shows.
const cellClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'grid min-h-11 place-items-center px-1 text-center text-[0.7rem] font-bold tracking-[0.08em] uppercase transition-colors',
    isActive ? 'bg-saffron text-ink' : 'sheet-grain text-ink hover:bg-saffron-soft',
  )

export default function Navigation() {
  return (
    <>
      {/* Desktop: top bar */}
      <header className="sheet-grain sticky top-0 z-10 hidden border-b-2 border-ink md:block">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Logo size="sm" />
          <ul className="flex gap-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.to === '/'} className={linkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Mobile: bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-3 gap-[2px] bg-ink sm:grid-cols-6">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={cellClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
