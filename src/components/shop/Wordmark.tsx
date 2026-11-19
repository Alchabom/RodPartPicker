import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { DorsalFin } from './DorsalFin'

/** The dorsal fin mark and the "RodPartPicker" name, linking home. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-sm text-[17px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <DorsalFin />
      RodPartPicker
    </Link>
  )
}
