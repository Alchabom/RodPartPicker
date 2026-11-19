import { useId } from 'react'
import { cn } from '@/lib/utils'

// A brook trout's dorsal fin: tall at the front, sloping to the back, olive-gold
// with the dark wavy bands the fish carries there.
const FIN = 'M2 18 L4.6 3.6 C5 2.4 6.6 2 7.8 2.8 C11.5 5.4 16.5 10.5 22.5 14.6 L22.5 18 Z'
const BANDS = [
  'M2 15 C6 13.5 9 16 13 14.5 S19 13 23 14.5',
  'M2 10.5 C6 9 9 11.5 13 10 S19 8.5 23 10',
  'M2 6 C6 4.5 9 7 13 5.5 S19 4 23 5.5',
]

/** The logo mark. Decorative: the wordmark beside it carries the name. */
export function DorsalFin({ className }: { className?: string }) {
  const clipId = useId()
  return (
    <svg aria-hidden="true" viewBox="0 0 24 20" className={cn('h-5 w-6 shrink-0', className)}>
      <defs>
        <clipPath id={clipId}>
          <path d={FIN} />
        </clipPath>
      </defs>
      <path d={FIN} className="fill-dorsal" />
      <g clipPath={`url(#${clipId})`} fill="none" strokeWidth={1.6} strokeLinecap="round" className="stroke-dorsal-band">
        {BANDS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
