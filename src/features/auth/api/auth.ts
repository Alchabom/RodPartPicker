import { apiFetch } from '@/lib/api'
import type { User } from '@hooks/auth'

/** POST /auth/code. Resolves on 202, whether or not the account exists. */
export async function requestCode(email: string): Promise<void> {
  await apiFetch<Record<string, never>>('/auth/code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/** POST /auth/verify. Sets the session cookies and returns the user. */
export function verifyCode(email: string, code: string): Promise<User> {
  return apiFetch<User>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

/** PUT /auth/me. 409 when the name is taken (ignoring case). */
export function updateDisplayName(displayName: string): Promise<User> {
  return apiFetch<User>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify({ displayName }),
  })
}
