import { useState, type FormEvent } from 'react'
import { Button } from '@components/ui/button'
import { ApiError } from '@/lib/api'
import { useAuth, type User } from '@hooks/auth'
import { updateDisplayName } from '../api/auth'

// Same rule as the API's DisplayNameIn, checked here first to save a request
const NAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

type Props = {
  /** Pre-filled value; the form can't submit until the input differs from it. */
  initialName?: string
  submitLabel: string
  /** Runs after the API accepts the name and the session holds the new user. */
  onSaved?: (user: User) => void
}

/** The display-name input shared by onboarding (/welcome) and renames (/account). */
export function DisplayNameForm({ initialName = '', submitLabel, onSaved }: Props) {
  const { setUser } = useAuth()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const unchanged = name.trim() === initialName

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!NAME_PATTERN.test(trimmed)) {
      setError('Use 3 to 30 letters, numbers or underscores')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = await updateDisplayName(trimmed)
      setUser(user)
      onSaved?.(user)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'That name is taken'
          : 'Something went wrong, try again',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="display-name" className="text-sm font-semibold text-olive">
          Display name
        </label>
        <input
          id="display-name"
          autoComplete="nickname"
          maxLength={30}
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'display-name-hint display-name-error' : 'display-name-hint'}
          className="w-full rounded-md border border-ink-3 bg-white px-3 py-2 text-base text-olive outline-none focus:border-belly focus:ring-2 focus:ring-belly/30"
        />
        <p id="display-name-hint" className="text-sm text-muted-foreground">
          3 to 30 letters, numbers or underscores, like TroutBum_42.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={busy || unchanged}
          className="bg-belly text-stone-page hover:bg-olive"
        >
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </form>

      {error && (
        <p id="display-name-error" role="alert" className="mt-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
