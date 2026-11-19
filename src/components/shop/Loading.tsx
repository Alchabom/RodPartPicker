import type { ReactNode } from 'react'

/**
 * Wraps skeleton shapes: screen readers hear `label` once, and the shapes
 * themselves stay hidden from them.
 */
export function Loading({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}
