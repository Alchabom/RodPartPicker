import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch, onSessionExpired } from '@/lib/api'
import { AuthContext } from './authContext'
import type { AuthStatus, User } from './types'

// The session state every page reads through useAuth(). The session itself
// lives in httpOnly cookies the browser sends; this only mirrors who it is.
// How refresh and sign-out flow: docs/auth/sessions.md.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const queryClient = useQueryClient()
  // Set by signOut, so a /auth/me still in flight can't sign the user back in
  const signedOut = useRef(false)

  // Who's signed in? A 401 here first tries /auth/refresh inside apiFetch,
  // so an expired access token is fixed without the user noticing.
  useEffect(() => {
    // StrictMode mounts twice in dev; only the surviving mount may set state
    let cancelled = false
    apiFetch<User>('/auth/me')
      .then((me) => {
        if (cancelled || signedOut.current) return
        setUserState(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUserState(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // A refresh failed somewhere in the app: the session is over.
  // onSessionExpired returns its unsubscribe, which is the effect's cleanup.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUserState(null)
        setStatus('anonymous')
        queryClient.removeQueries({ queryKey: ['builds'] })
      }),
    [queryClient],
  )

  const setUser = (next: User) => {
    signedOut.current = false
    setUserState(next)
    setStatus('authenticated')
  }

  const signOut = async () => {
    signedOut.current = true
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Offline or server error: still sign out locally (below), and don't
      // hand the error to a click handler that has nothing to do with it
    }
    setUserState(null)
    setStatus('anonymous')
    // Drop this user's builds so the next account can't see them from cache.
    // A literal key: shared code can't import from the builder feature.
    queryClient.removeQueries({ queryKey: ['builds'] })
  }

  return (
    <AuthContext value={{ status, user, setUser, signOut }}>{children}</AuthContext>
  )
}
