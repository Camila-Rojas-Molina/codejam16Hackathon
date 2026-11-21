// MIGO's main app frame: navigation on the left, the current section in the middle, and the
// status sidebar on the right (desktop). Tablets get an icon rail + top bar; phones get a top bar
// + bottom tab bar. Only for signed-in people who've finished the questionnaire.
import { Navigate, Outlet } from 'react-router'
import { hasUniversalProfile } from '../../features/profile/flow'
import { useStore } from '../../store/useStore'
import { MobileTabBar, SideNav } from './DashboardNav'
import RightSidebar from './RightSidebar'
import { TopBar } from './StatusBar'

export default function DashboardLayout() {
  const { account, profile } = useStore()
  if (!account) return <Navigate to="/onboarding" replace />
  if (!hasUniversalProfile(profile)) return <Navigate to="/onboarding/questions" replace />

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[6.5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)_20rem] xl:grid-cols-[16.5rem_minmax(0,1fr)_23rem]">
      <SideNav />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar />
        <main id="main" className="flex flex-1 flex-col px-4 pt-5 pb-32 sm:px-6 md:pb-8 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <RightSidebar />
      <MobileTabBar />
    </div>
  )
}
