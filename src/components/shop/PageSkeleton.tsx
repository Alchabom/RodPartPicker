import { Skeleton } from '@/components/ui/skeleton'
import { Loading } from './Loading'

/** A generic page placeholder: a title, a line of description and a content block. */
export function PageSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <Loading label={label} className="mx-auto w-full max-w-5xl px-4 py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <Skeleton className="mt-8 h-64 w-full rounded-card" />
    </Loading>
  )
}
