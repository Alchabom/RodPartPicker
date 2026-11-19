import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { FinEdge } from './FinEdge'

/** The fin-edge mark and the "RodPartPicker" name, linking home. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-sm text-[17px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span aria-hidden="true" className="relative h-5 w-2.5 rounded-sm">
        <FinEdge className="w-full rounded-sm" />
      </span>
      RodPartPicker
    </Link>
  )
}
