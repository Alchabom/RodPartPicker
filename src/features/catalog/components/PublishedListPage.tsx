import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { publishedKeys } from '@/lib/publishedKeys'
import { listPublished } from '../api/published'
import { parseCatalogParams } from '../utils/params'
import { CatalogFilters } from './CatalogFilters'
import { PublishedCard } from './PublishedCard'

export function PublishedListPage() {
  const [search, setSearch] = useSearchParams()
  const params = parseCatalogParams(search)
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: publishedKeys.list(params),
    queryFn: ({ signal }) => listPublished(params, signal),
    placeholderData: keepPreviousData,
  })

  const hasFilters = params.weight !== undefined || params.maxPrice !== undefined

  // Changing a filter writes the URL and goes back to page 1
  const setFilters = (changes: { weight?: number; maxPrice?: number }) => {
    const next = new URLSearchParams(search)
    next.delete('page')
    for (const key of ['weight', 'maxPrice'] as const) {
      if (changes[key] === undefined) next.delete(key)
      else next.set(key, String(changes[key]))
    }
    setSearch(next)
  }

  const goToPage = (page: number) => {
    const next = new URLSearchParams(search)
    if (page <= 1) next.delete('page')
    else next.set('page', String(page))
    setSearch(next)
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  let body
  if (!data && (!error || isFetching)) {
    body = <p className="py-16 text-center text-muted-foreground">Loading builds…</p>
  } else if (!data) {
    body = (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <Button className="mt-6" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  } else {
    body = (
      <>
        {data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              {hasFilters
                ? 'No builds match these filters'
                : data.total > 0
                  ? 'No builds on this page'
                  : 'No builds published yet'}
            </p>
            {hasFilters && (
              <Button className="mt-6" onClick={() => setSearch(new URLSearchParams())}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((build) => (
              <PublishedCard key={build.id} build={build} />
            ))}
          </ul>
        )}
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={params.page <= 1} onClick={() => goToPage(Math.min(params.page - 1, pages))}>
            Previous
          </Button>
          <span className="text-sm tabular-nums">
            Page {params.page} of {pages}
          </span>
          <Button variant="outline" disabled={params.page >= pages} onClick={() => goToPage(params.page + 1)}>
            Next
          </Button>
        </nav>
      </>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-te-papa-green">Completed Builds</h1>
      <CatalogFilters params={params} onChange={setFilters} />
      {body}
    </main>
  )
}
