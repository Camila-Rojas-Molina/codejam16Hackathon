// The persistent right-hand column (wide desktops, xl+): status, today's quest, the shop, and the latest
// message. Stacked ruled cells, like the side column of a printed menu.
import { Link } from 'react-router'
import RecentMessage from '../../features/chat/components/RecentMessage'
import DailyQuestCard from '../../features/quests/components/DailyQuestCard'
import Icon from '../icons/Icon'
import { ArrowCell } from '../ui/Button'
import { AccountStatus, SettingsButton } from './StatusBar'

export default function RightSidebar() {
  return (
    <aside aria-label="Your status" className="sheet-grain sticky top-0 hidden h-dvh flex-col overflow-y-auto border-l-2 border-ink xl:flex">
      <div className="p-5">
        <AccountStatus />
      </div>
      <div className="hatch-band" aria-hidden />
      <DailyQuestCard className="border-b-2 border-ink" />

      <Link to="/shop" className="group/arrow flex min-h-20 items-stretch border-b-2 border-ink transition-colors hover:bg-saffron-soft">
        <span className="flex flex-1 items-center gap-3 px-5">
          <Icon name="shop" className="size-9 transition-transform group-hover/arrow:-rotate-6" />
          <span>
            <span className="block font-display text-xl leading-none uppercase">Shop</span>
            <span className="mt-1 block text-sm leading-tight">Treat Migo with your points</span>
          </span>
        </span>
        <ArrowCell />
      </Link>

      {/* Latest message with settings right beside it, at the bottom of the column. */}
      <div className="mt-auto flex items-end gap-3 p-5">
        <RecentMessage className="min-w-0 flex-1" />
        <SettingsButton className="mb-1" />
      </div>
    </aside>
  )
}
