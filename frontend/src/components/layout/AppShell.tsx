import { Outlet } from 'react-router'
import Navigation from './Navigation'

// Page frame shared by every route. Nav is bottom bar on mobile, top bar on desktop.
export default function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <Navigation />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:pt-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
