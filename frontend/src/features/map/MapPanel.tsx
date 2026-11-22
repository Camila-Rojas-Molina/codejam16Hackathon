// What the map is pointed at, and where to go from it. A column beside the map on laptops and
// desktops; on phones and tablets just the one line above the map (the rest is in the nav).
import { Link } from 'react-router'
import Icon, { type IconName } from '../../components/icons/Icon'
import { ArrowCell } from '../../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../../components/ui/buttonStyles'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'
import { activeTrip } from '../profile/model'

/** "Exploring Lisbon" / "Hosting in Montréal" / a nudge to pick a mode. */
function useContextLine(): { icon: IconName; lead: string; place: string | null; to: string; link: string } {
  const { profile } = useStore()
  const trip = activeTrip(profile)
  if (profile?.activeMode === 'tourist' && trip) return { icon: 'plane', lead: 'Exploring', place: trip.destination, to: '/trips', link: 'Trips' }
  if (profile?.activeMode === 'local' && profile.local?.homeCity)
    return { icon: 'house', lead: 'Hosting in', place: profile.local.homeCity, to: '/profile', link: 'Edit' }
  return { icon: 'shuffle', lead: 'Pick Tourist or Local mode to set where you’re exploring', place: null, to: '/mode', link: 'Choose' }
}

/** Phones and tablets: one ruled line above the map. */
export function MapContextBar({ className }: { className?: string }) {
  const line = useContextLine()
  return (
    <p className={cn('sheet-grain flex min-h-12 items-center gap-2 border-2 border-ink px-3 text-sm font-semibold', className)}>
      <Icon name={line.icon} className="size-5" />
      <span className="min-w-0 flex-1 truncate">
        {line.lead} {line.place && <strong className="font-bold">{line.place}</strong>}
      </span>
      <Link to={line.to} className="-mr-1 grid min-h-11 shrink-0 place-items-center px-1 underline decoration-2 underline-offset-2">
        {line.link}
      </Link>
    </p>
  )
}

const ACTIONS: { to: string; icon: IconName; title: string; text: string }[] = [
  { to: '/quests', icon: 'quest', title: 'Quests', text: 'Today’s challenge and your rewards' },
  { to: '/hunts', icon: 'camera', title: 'Photo hunt', text: 'Team up and find a mystery spot' },
  { to: '/chat?tab=discover', icon: 'search', title: 'Discover', text: 'People who share your vibe' },
]

/** Laptops and desktops: the column beside the map. Pass the display classes (e.g. "hidden lg:flex"). */
export default function MapPanel({ className }: { className?: string }) {
  const { profile } = useStore()
  const line = useContextLine()
  const cities = profile?.universal?.citiesDiscovered.length ?? 0

  return (
    <aside aria-label="Map details" className={cn('flex-col gap-5', className)}>
      <section className="sheet-grain border-2 border-ink">
        <p className="eyebrow border-b-2 border-ink px-4 py-2">Where you are</p>
        <div className="flex items-start gap-3 p-4">
          <span className="grid size-12 shrink-0 place-items-center border-2 border-ink bg-teal-soft" aria-hidden>
            <Icon name={line.icon} className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-snug">{line.lead}</p>
            {line.place && <p className="font-display text-2xl leading-tight break-words uppercase">{line.place}</p>}
            <Link to={line.to} className="mt-1 inline-block text-sm font-semibold underline decoration-2 underline-offset-2">
              {line.link}
            </Link>
          </div>
        </div>
        <Link to="/profile#cities" className="flex min-h-12 items-center gap-3 border-t-2 border-ink px-4 text-sm font-semibold transition-colors hover:bg-saffron-soft">
          <Icon name="globe" className="size-6" />
          <span className="flex-1">
            {cities === 0 ? 'Start your atlas' : `${cities} ${cities === 1 ? 'city' : 'cities'} on your atlas`}
          </span>
          <Icon name="arrow-right" accent="none" strokeWidth={2.2} className="size-4" />
        </Link>
      </section>

      <nav aria-label="From the map" className="flex flex-col gap-3">
        {ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} className={cn(arrowRowClasses, 'min-h-16')}>
            <span className={cn(arrowLabel, 'gap-3 py-2')}>
              <Icon name={a.icon} className="size-7 shrink-0" />
              <span className="min-w-0">
                <span className="block font-display text-lg leading-none uppercase">{a.title}</span>
                <span className="mt-1 block text-xs leading-snug font-medium tracking-normal normal-case">{a.text}</span>
              </span>
            </span>
            <ArrowCell />
          </Link>
        ))}
      </nav>
    </aside>
  )
}
