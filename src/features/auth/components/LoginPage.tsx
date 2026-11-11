import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@components/ui/button'
import { ApiError } from '@/lib/api'
import { useAuth } from '@hooks/auth'
import { requestCode, verifyCode } from '../api/auth'
import { safeNext } from '../utils/safeNext'

// Matches the API's per-email cooldown, so "Resend code" never hits a 429
const RESEND_AFTER_MS = 60_000

const inputClass =
  'w-full rounded-md border border-twine bg-white px-3 py-2 text-base text-te-papa-green outline-none focus:border-spectra focus:ring-2 focus:ring-spectra/30'

/** Turn a failed request into the sentence the user sees. */
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const seconds = error.headers.get('Retry-After') ?? '60'
      return `Try again in ${seconds} seconds`
    }
    if (error.status === 400) return 'That code is wrong or expired'
    if (error.status === 422) return 'Check what you typed and try again'
  }
  return fallback
}

export function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second while the resend button is waiting
  const resendIn = Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000))
  useEffect(() => {
    if (step !== 'code' || resendIn === 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [step, resendIn])

  async function sendCode() {
    setBusy(true)
    setError(null)
    try {
      await requestCode(email)
      // Same screen whether or not the email has an account (the API never says)
      setStep('code')
      setCode('')
      setSentAt(Date.now())
      setNow(Date.now())
    } catch (e) {
      setError(errorMessage(e, "Couldn't send the code, try again"))
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitEmail(event: FormEvent) {
    event.preventDefault()
    await sendCode()
  }

  async function onSubmitCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await verifyCode(email, code)
      setUser(user)
      // New accounts pick a display name first, then continue to `next`
      const welcome = `/welcome?next=${encodeURIComponent(next)}`
      navigate(user.displayName === null ? welcome : next, { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Something went wrong, try again'))
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 py-16">
      <h1 className="text-3xl font-bold text-te-papa-green">Log in</h1>

      {step === 'email' ? (
        <form onSubmit={onSubmitEmail} className="mt-6 flex flex-col gap-3">
          <label htmlFor="login-email" className="text-sm font-semibold text-plantation">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <p className="text-sm text-muted-foreground">
            We'll email you a 6-digit code. No password needed.
          </p>
          <Button type="submit" size="lg" disabled={busy} className="bg-spectra text-linen hover:bg-te-papa-green">
            {busy ? 'Sending…' : 'Email me a code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitCode} className="mt-6 flex flex-col gap-3">
          <p className="text-plantation" role="status">
            Check your email. We sent a code to <strong>{email}</strong>.
          </p>
          <label htmlFor="login-code" className="text-sm font-semibold text-plantation">
            Code
          </label>
          <input
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} tracking-[0.4em]`}
          />
          <Button type="submit" size="lg" disabled={busy} className="bg-spectra text-linen hover:bg-te-papa-green">
            {busy ? 'Checking…' : 'Log in'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="link"
              className="px-0"
              disabled={busy || resendIn > 0}
              onClick={sendCode}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </Button>
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
            >
              Use a different email
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </main>
  )
}
