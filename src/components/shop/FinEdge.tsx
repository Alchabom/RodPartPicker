import { cn } from '@/lib/utils'

export function FinEdge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('absolute inset-y-0 left-0 w-2.5 rounded-l-[inherit]', className)}
      style={{ background: 'var(--fin-edge)' }}
    />
  )
}
