import { cn } from '@/lib/utils'

/**
 * A small dry-fly hook (eye, shank, bend, point, barb) for the end of a fly
 * line. Decorative. The eye is centered at (5, 5) of its 20×40 box, so place
 * the box 5px up and left of where the line ends.
 */
export function FlyHook({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 40"
      width="20"
      height="40"
      fill="none"
      strokeLinecap="round"
      className={cn('block stroke-dorsal-band', className)}
    >
      <circle cx="5" cy="5" r="2.6" strokeWidth="1.3" />
      <path d="M5 7.6 V29 C5 38 15 38 15 29 V24" strokeWidth="1.6" />
      <path d="M15 24 L12.4 27.2" strokeWidth="1.2" />
    </svg>
  )
}
