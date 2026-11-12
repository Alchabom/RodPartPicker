import { createContext } from 'react'
import type { AuthStatus, User } from './types'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** After sign-in or a display-name change: store the user, mark authenticated. */
  setUser: (user: User) => void
  /** POST /auth/logout, then mark anonymous. */
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
