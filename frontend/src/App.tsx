import { BrowserRouter, Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell'
import AccessibilityPage from './pages/AccessibilityPage'
import DogsPage from './pages/DogsPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import NotFoundPage from './pages/NotFoundPage'
import QuestsPage from './pages/QuestsPage'
import TeamPage from './pages/TeamPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
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
