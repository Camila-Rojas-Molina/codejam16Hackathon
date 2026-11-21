// The persistent right-hand column (desktop): status, today's quest, the shop, and the latest message.
import { Link } from 'react-router'
import RecentMessage from '../../features/chat/components/RecentMessage'
import DailyQuestCard from '../../features/quests/components/DailyQuestCard'
import { ShopIcon } from '../illustrations/Icons'
import { AccountStatus, SettingsButton } from './StatusBar'

export default function RightSidebar() {
  return (
    <aside aria-label="Your status" className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto px-5 py-6 lg:flex">
      <AccountStatus />
      <DailyQuestCard />

      <Link
        to="/shop"
        className="group flex min-h-16 items-center gap-3 rounded-[1.4rem_1.2rem_1.5rem_1.1rem] border-4 border-red-rim bg-red px-4 text-white transition-transform active:scale-[0.97]"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-paper transition-transform group-hover:-rotate-6 [&_svg]:size-8">
          <ShopIcon />
        </span>
        <span className="flex-1">
          <span className="block font-type text-lg tracking-wider uppercase">Shop</span>
          <span className="block text-sm leading-tight">Treat Migo with your points</span>
        </span>
        <span aria-hidden className="font-type text-xl">
          →
        </span>
      </Link>

      {/* Latest message with settings right beside it, at the bottom of the column. */}
      <div className="mt-auto flex items-end gap-2 pt-4">
        <RecentMessage className="min-w-0 flex-1" />
        <SettingsButton className="mb-1" />
      </div>
    </aside>
  )
}
