import { Loading } from '@components/shop'
import { Skeleton } from '@/components/ui/skeleton'
import { COMPONENTS } from '../api/components'

/** BuilderPage's shape (title, hint, one row per component, total) while parts or a build load. */
export function BuilderSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="mx-auto w-full max-w-5xl px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 mb-8 h-6 w-96 max-w-full" />
      <div className="border-b border-hairline pb-3">
        <Skeleton className="h-4 w-full max-w-xs" />
      </div>
      {COMPONENTS.map((c) => (
        <div
          key={c.type}
          data-testid="builder-skeleton-row"
          className="flex h-14 items-center gap-6 border-b border-hairline"
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="ml-auto h-5 w-16" />
        </div>
      ))}
      <div className="flex h-12 items-center justify-end">
        <Skeleton className="h-5 w-24" />
      </div>
    </Loading>
  )
}
