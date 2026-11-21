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
    'rounded-full px-3 py-2 font-type text-xs tracking-wider uppercase transition-colors',
    isActive ? 'bg-red text-white' : 'text-navy hover:bg-bubble-light',
  )

export default function Navigation() {
  return (
    <>
      {/* Desktop: top bar */}
      <header className="sticky top-0 z-10 hidden border-b-[3px] border-navy bg-paper md:block">
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
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-navy bg-paper md:hidden">
        <ul className="mx-auto flex max-w-md justify-around px-2 py-2">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={linkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
