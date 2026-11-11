import { useEffect, useState, type ReactNode } from 'react'
import { apiFetch, onSessionExpired } from '@/lib/api'
import { AuthContext } from './authContext'
import type { AuthStatus, User } from './types'

// The session state every page reads through useAuth(). The session itself
// lives in httpOnly cookies the browser sends; this only mirrors who it is.
// How refresh and sign-out flow: docs/auth/sessions.md.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Who's signed in? A 401 here first tries /auth/refresh inside apiFetch,
  // so an expired access token is fixed without the user noticing.
  useEffect(() => {
    // StrictMode mounts twice in dev; only the surviving mount may set state
    let cancelled = false
    apiFetch<User>('/auth/me')
      .then((me) => {
        if (cancelled) return
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
      }),
    [],
  )

  const setUser = (next: User) => {
    setUserState(next)
    setStatus('authenticated')
  }

  const signOut = async () => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } finally {
      // Signed out locally even if the request failed (e.g. offline)
      setUserState(null)
      setStatus('anonymous')
    }
  }

  return (
    <AuthContext value={{ status, user, setUser, signOut }}>{children}</AuthContext>
  )
}
