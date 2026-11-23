import { cn } from '@/lib/utils'

/**
 * A wind knot: the overhand knot a bad cast ties in a leader, drawn as a short
 * loop in a vertical line. Marks a part that doesn't fit the rest of the rig.
 * Decorative. 16×24, with the line entering at the top center and leaving at
 * the bottom center.
 */
export function WindKnot({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 24"
      width="16"
      height="24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('block', className)}
    >
      {/* The line in and out stays the line's color; the knot itself is red */}
      <path d="M8 0 V6 M8 19 V24" strokeWidth="1.6" className="stroke-belly" />
      <path d="M8 6 C8 12 14.5 13 14 9 C13.5 5 3 7 4 13 C4.6 16.5 8 16 8 19" strokeWidth="1.6" className="stroke-negative" />
    </svg>
  )
}
