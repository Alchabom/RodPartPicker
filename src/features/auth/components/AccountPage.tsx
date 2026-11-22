import { useState } from 'react'
import { useAuth } from '@hooks/auth'
import { DisplayNameForm } from './DisplayNameForm'
import { PageHeader } from '@components/shop'

/** Account settings: the email (read-only) and a display-name rename. */
export function AccountPage() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  // RequireAuth guarantees a user with a display name
  if (!user?.displayName) return null

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 py-16">
      <PageHeader title="Account settings" />

      <p className="mt-6 text-sm font-semibold text-plantation">Email</p>
      <p className="mt-1 text-te-papa-green">{user.email}</p>

      {/* Keyed by the name, so after a save the form restarts from the new name */}
      <DisplayNameForm
        key={user.displayName}
        initialName={user.displayName}
        submitLabel="Save"
        onSaved={() => setSaved(true)}
      />

      {saved && (
        <p role="status" className="mt-4 text-sm font-semibold text-spectra">
          Saved
        </p>
      )}
    </main>
  )
}
