import { BrowserRouter, Route, Routes } from 'react-router'
import RequireAuth from './components/auth/RequireAuth'
import AppShell from './components/layout/AppShell'
import DashboardLayout from './components/layout/DashboardLayout'
import AccessibilityPage from './pages/AccessibilityPage'
import ChatPage from './pages/ChatPage'
import DogsPage from './pages/DogsPage'
import HuntsPage from './pages/HuntsPage'
import LocalSetupPage from './pages/LocalSetupPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import MatchPage from './pages/MatchPage'
import ModePage from './pages/ModePage'
import NotFoundPage from './pages/NotFoundPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import QuestionnairePage from './pages/QuestionnairePage'
import QuestsPage from './pages/QuestsPage'
import SettingsPage from './pages/SettingsPage'
import ShopPage from './pages/ShopPage'
import SignupPage from './pages/SignupPage'
import StyleguidePage from './pages/StyleguidePage'
import TeamPage from './pages/TeamPage'
import TouristSetupPage from './pages/TouristSetupPage'
import TripsPage from './pages/TripsPage'
import WelcomePage from './pages/WelcomePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: welcome and the login screens (these redirect away when there's no backend). */}
        <Route index element={<WelcomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        {/* TEMPORARY: remove with StyleguidePage before the demo. */}
        <Route path="styleguide" element={<StyleguidePage />} />

        {/* Everything else needs a login when the backend is on (no-op in device-only mode). */}
        <Route element={<RequireAuth />}>
          {/* Core loop: full-screen, phone-width pages */}
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="onboarding/questions" element={<QuestionnairePage />} />

          {/* One account, two modes: pick one, and set up its context the first time it's used. */}
          <Route path="mode" element={<ModePage />} />
          <Route path="mode/tourist" element={<TouristSetupPage />} />
          <Route path="mode/tourist/:tripId" element={<TouristSetupPage />} />
          <Route path="mode/local" element={<LocalSetupPage />} />

          {/* The main app: left nav, centre section, right status sidebar. */}
          <Route element={<DashboardLayout />}>
            <Route path="map" element={<MapPage />} />
            <Route path="quests" element={<QuestsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:personId" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="trips" element={<TripsPage />} />
          </Route>

          <Route path="match" element={<MatchPage />} />
          <Route path="hunts" element={<HuntsPage />} />

          {/* Original scaffold pages, not part of the PRD loop. */}
          <Route element={<AppShell />}>
            <Route path="team" element={<TeamPage />} />
            <Route path="dogs" element={<DogsPage />} />
            <Route path="accessibility" element={<AccessibilityPage />} />
          </Route>
        </Route>

        <Route element={<AppShell />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
