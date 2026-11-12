import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@hooks/auth'

/**
 * Show `children` only to a signed-in user who has a display name.
 *
 * - Still checking the session: render nothing (no flash of the login page).
 * - Signed out: go to /login, coming back here afterwards.
 * - Signed in without a display name: go to /welcome first (except on
 *   /welcome itself, or it would redirect to itself forever).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()
  const here = encodeURIComponent(location.pathname + location.search)

  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to={`/login?next=${here}`} replace />
  if (user?.displayName === null && location.pathname !== '/welcome') {
    return <Navigate to={`/welcome?next=${here}`} replace />
  }
  return children
}
