import { Skeleton } from '@/components/ui/skeleton'
import type { BuildCardVariant } from './BuildCard'

/** Same box as BuildCard (image, title, byline, specs, price), so nothing jumps when cards arrive. */
export function BuildCardSkeleton({ variant = 'default' }: { variant?: BuildCardVariant }) {
  if (variant === 'compact') {
    return (
      <div
        data-testid="build-card-skeleton"
        data-variant="compact"
        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 rounded-card border border-hairline bg-stone-card p-3"
      >
        <Skeleton className="aspect-[2/1] w-full self-start" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-1 h-5 w-2/3" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    )
  }
  return (
    <div
      data-testid="build-card-skeleton"
      data-variant="default"
      className="flex flex-col gap-1 rounded-card border border-hairline bg-stone-card p-4"
    >
      <Skeleton className="mb-2 aspect-[2/1] w-full" />
      {/* Heights are the card's line heights: title 28, byline 20, specs 20, price 24 */}
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-2 h-5 w-2/3" />
      <Skeleton className="h-6 w-16" />
    </div>
  )
}
