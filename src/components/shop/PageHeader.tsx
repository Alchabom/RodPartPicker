import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

export interface BackLink {
  to: string
  label: string
  // Runs instead of following `to` on a plain click (e.g. going back in
  // history); modifier clicks still open `to` as a normal link
  onClick?: () => void
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: BackLink
}) {
  const onBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!back?.onClick) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    back.onClick()
  }

  return (
    <div>
      {back && (
        <Link
          to={back.to}
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-medium text-olive">{title}</h1>
          {description && <p className="mt-1 text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
