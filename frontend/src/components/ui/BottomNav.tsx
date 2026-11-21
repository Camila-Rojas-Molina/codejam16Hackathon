import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'

type Tab = { to: string; label: string; icon: ReactNode }

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const tabs: Tab[] = [
  {
    to: '/hunts',
    label: 'Hunts',
    // Folded trail map
    icon: (
      <svg {...iconProps}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
    ),
  },
  {
    to: '/leaderboard',
    label: 'Leaderboard',
    // Trophy
    icon: (
      <svg {...iconProps}>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
        <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    // Person
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
]

type BottomNavProps = {
  className?: string
}

// Bottom tab bar for the main screens. Fixed to the bottom of a phone-width column.
export default function BottomNav({ className }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <ul className="flex gap-1.5 rounded-full border-[3px] border-navy bg-paper p-1.5">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full border-[3px] font-type text-[0.7rem] tracking-wider uppercase transition-[transform,background-color] duration-100 active:scale-95',
                  // Active tab is a mini red pill: white on red = 4.7:1.
                  isActive
                    ? 'border-red-rim bg-red text-white'
                    : 'border-transparent text-navy hover:bg-bubble-light',
                )
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
