import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-stone-card px-6 py-12 text-center">
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      <p className="max-w-md text-ink-2">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
