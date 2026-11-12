/** The signed-in user, as the API's UserOut returns it. */
export type User = {
  id: number
  email: string
  displayName: string | null
}

/** `loading` until the first GET /auth/me answers. */
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'
