import { useEffect, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { BuildCard, BuildCardSkeleton, EmptyState, Loading, SectionHeading } from '@components/shop'
import { Button } from '@/components/ui/button'
import { listPublished } from '@/lib/published'
import { publishedKeys } from '@/lib/publishedKeys'

const SHOWN = 3

export function RecentBuilds() {
  const headingId = useId()
  const { data, error, isPending } = useQuery({
    queryKey: publishedKeys.list({ page: 1 }),
    queryFn: ({ signal }) => listPublished({ page: 1 }, signal),
  })

  // The section is optional: log the failure and let the page work without it.
  useEffect(() => {
    if (error) console.error('Could not load recent builds', error)
  }, [error])

  if (error && !data) return null

  const items = data?.items.slice(0, SHOWN) ?? []

  return (
    // The right-hand column beside the rig steps (below lg, under them)
    <section aria-labelledby={headingId} className="min-w-0">
      <SectionHeading id={headingId}>Recently rigged</SectionHeading>
      <div className="mt-6">
        {isPending ? (
          <Loading label="Loading recent builds">
            <div className="flex flex-col gap-3">
              {Array.from({ length: SHOWN }, (_, i) => (
                <BuildCardSkeleton key={i} variant="compact" />
              ))}
            </div>
          </Loading>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing on the Rack yet"
            description="Post yours from the Builder."
            action={
              <Button asChild>
                <Link to="/builder">Start a build</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul aria-labelledby={headingId} className="flex flex-col gap-3">
              {items.map((build) => (
                <BuildCard key={build.id} build={build} variant="compact" />
              ))}
            </ul>
            <Button asChild variant="link" className="mt-6">
              <Link to="/rack">See all of the Community Rack</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
