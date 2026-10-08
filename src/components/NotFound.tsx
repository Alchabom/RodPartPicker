import { Link } from 'react-router'

interface NotFoundProps {
  message?: string
  backTo?: string
  backLabel?: string
}

export function NotFound({
  message = "We couldn't find that page.",
  backTo = '/',
  backLabel = 'Back to home',
}: NotFoundProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-te-papa-green">Not found</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <Link to={backTo} className="mt-6 inline-block font-semibold text-primary underline underline-offset-4">
        {backLabel}
      </Link>
    </div>
  )
}
