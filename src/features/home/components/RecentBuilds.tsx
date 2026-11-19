import { useEffect, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { BuildCard, Container, EmptyState, SectionHeading } from '@components/shop'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
    <Container as="section" className="pt-8 pb-24">
      <SectionHeading id={headingId}>Recently rigged</SectionHeading>
      <div className="mt-10">
        {isPending ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: SHOWN }, (_, i) => (
              <Skeleton key={i} data-testid="build-skeleton" className="h-64 rounded-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No builds published yet"
            description="Publish yours from the builder."
            action={
              <Button asChild>
                <Link to="/builder">Start a build</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul aria-labelledby={headingId} className="grid gap-4 md:grid-cols-3">
              {items.map((build) => (
                <BuildCard key={build.id} build={build} />
              ))}
            </ul>
            <Button asChild variant="link" className="mt-8">
              <Link to="/builds">See all completed builds</Link>
            </Button>
          </>
        )}
      </div>
    </Container>
  )
}
