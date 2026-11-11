import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@components/ui/button'
import { ApiError } from '@/lib/api'
import { useAuth } from '@hooks/auth'
import { updateDisplayName } from '../api/auth'
import { safeNext } from '../utils/safeNext'

// Same rule as the API's DisplayNameIn, checked here first to save a request
const NAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

export function DisplayNamePage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      setUser(await updateDisplayName(trimmed))
      navigate(safeNext(searchParams.get('next')), { replace: true })
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'That name is taken'
          : 'Something went wrong, try again',
      )
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 py-16">
      <h1 className="text-3xl font-bold text-te-papa-green">Pick a display name</h1>
      <p className="mt-2 text-plantation">Other anglers see this on your builds.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="display-name" className="text-sm font-semibold text-plantation">
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
          aria-describedby="display-name-hint"
          className="w-full rounded-md border border-twine bg-white px-3 py-2 text-base text-te-papa-green outline-none focus:border-spectra focus:ring-2 focus:ring-spectra/30"
        />
        <p id="display-name-hint" className="text-sm text-muted-foreground">
          3 to 30 letters, numbers or underscores, like TroutBum_42.
        </p>
        <Button type="submit" size="lg" disabled={busy} className="bg-spectra text-linen hover:bg-te-papa-green">
          {busy ? 'Saving…' : 'Continue'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </main>
  )
}
