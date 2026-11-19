import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '@hooks/auth'
import { safeNext } from '../utils/safeNext'
import { DisplayNameForm } from './DisplayNameForm'

/**
 * Onboarding: a new user picks their first display name. Renames happen on
 * /account instead, so a user who already has a name is sent straight on to
 * `next`. That redirect also moves the user on after a successful submit,
 * because the form stores the new name in the session.
 */
export function DisplayNamePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  if (user?.displayName != null) {
    return <Navigate to={safeNext(searchParams.get('next'))} replace />
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 py-16">
      <h1 className="text-3xl font-bold text-te-papa-green">Pick a display name</h1>
      <p className="mt-2 text-plantation">Other anglers see this on your builds.</p>
      <DisplayNameForm submitLabel="Continue" />
    </main>
  )
}
