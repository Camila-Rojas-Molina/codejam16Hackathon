// MIGO's main app frame. Only for signed-in people who've finished the questionnaire.
//   phones (< md)        top status bar + bottom tab bar
//   tablets (md)         icon rail + top status bar
//   laptops (lg)         full nav column + top status bar, so the section gets the width
//   desktops (xl+)       nav column, the section, and the status sidebar on the right
// Pages own their own max-width and columns; the frame just gives them the room.
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { hasUniversalProfile } from '../../features/profile/flow'
import { ECONOMY_PAGES, type EconomyPage } from '../../lib/economy'
import { useStore } from '../../store/useStore'
import { MobileTabBar, SideNav } from './DashboardNav'
import RightSidebar from './RightSidebar'
import { TopBar } from './StatusBar'

/** The economy section a path belongs to ('/chat/p1' → 'chat'), for "visit" quests. */
const visitPageOf = (pathname: string): EconomyPage | null => {
  const first = pathname.split('/')[1] as EconomyPage
  return ECONOMY_PAGES.includes(first) ? first : null
}

export default function DashboardLayout() {
  const { account, profile, recordVisit } = useStore()
  const page = visitPageOf(useLocation().pathname)
  const ready = !!account && hasUniversalProfile(profile)
  // Opening Map, Shop, Gallery, Chat or Quests counts for visit quests (once a day per page).
  useEffect(() => {
    if (ready && page) recordVisit(page)
  }, [ready, page, recordVisit])

  if (!account) return <Navigate to="/onboarding" replace />
  if (!hasUniversalProfile(profile)) return <Navigate to="/onboarding/questions" replace />

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[6.5rem_minmax(0,1fr)] lg:grid-cols-[14.5rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem] 2xl:grid-cols-[17rem_minmax(0,1fr)_24rem]">
      <SideNav />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar />
        <main id="main" className="flex flex-1 flex-col px-4 pt-5 pb-28 sm:px-6 sm:pt-6 md:pb-10 lg:px-8 lg:pt-8 xl:px-10 xl:pt-10 2xl:px-14">
          <Outlet />
        </main>
      </div>
      <RightSidebar />
      <MobileTabBar />
    </div>
  )
}
