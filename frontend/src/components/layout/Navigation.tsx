import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'

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
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:text-ink',
  )

export default function Navigation() {
  return (
    <>
      {/* Desktop: top bar */}
      <header className="sticky top-0 z-10 hidden border-b border-slate-200 bg-surface/90 backdrop-blur md:block">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="text-lg font-bold text-brand-700">Travel Quest</span>
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
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-surface/95 backdrop-blur md:hidden">
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
