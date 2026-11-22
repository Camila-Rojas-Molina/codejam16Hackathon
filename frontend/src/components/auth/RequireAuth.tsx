// Route guard for the signed-in parts of the app. With a backend (authEnabled) you must log in
// first; on device-only mode it renders straight through, so today's flow is unchanged.
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useStore } from '../../store/useStore'

export default function RequireAuth({ children }: { children?: ReactNode }) {
  const { authEnabled, session } = useStore()
  const location = useLocation()
  if (authEnabled && !session) return <Navigate to="/login" replace state={{ from: location }} />
  return children ?? <Outlet />
}
