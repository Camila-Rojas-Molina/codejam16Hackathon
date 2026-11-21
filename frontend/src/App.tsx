import { BrowserRouter, Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell'
import AccessibilityPage from './pages/AccessibilityPage'
import DogsPage from './pages/DogsPage'
import HuntsPage from './pages/HuntsPage'
import MapPage from './pages/MapPage'
import MatchPage from './pages/MatchPage'
import NotFoundPage from './pages/NotFoundPage'
import OnboardingPage from './pages/OnboardingPage'
import QuestsPage from './pages/QuestsPage'
import StyleguidePage from './pages/StyleguidePage'
import TeamPage from './pages/TeamPage'
import WelcomePage from './pages/WelcomePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Core loop: full-screen, phone-width pages */}
        <Route index element={<WelcomePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="match" element={<MatchPage />} />
        <Route path="hunts" element={<HuntsPage />} />

        {/* TEMPORARY: remove with StyleguidePage before the demo. */}
        <Route path="styleguide" element={<StyleguidePage />} />

        {/* Original scaffold pages, not part of the PRD loop. */}
        <Route element={<AppShell />}>
          <Route path="quests" element={<QuestsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="dogs" element={<DogsPage />} />
          <Route path="accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
