import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { catalogKey, fetchCatalog } from '../api/parts'
import { CatalogContext } from '../hooks/catalogContext'

// Route layout for /builder/*: loads the parts catalog once, then renders
// the child route with the catalog available through useCatalog().
export function BuilderLayout() {
  const { data: catalog, error, isFetching, refetch } = useQuery({
    queryKey: catalogKey,
    queryFn: ({ signal }) => fetchCatalog(signal),
    staleTime: Infinity,
  })

  if (!catalog && (!error || isFetching)) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading parts…</p>
  }

  if (!catalog) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-te-papa-green">Couldn't load parts</h1>
        <p className="mt-2 text-muted-foreground">
          Is the API running? Start it from <code>api/</code> with <code>uv run fastapi dev app/main.py --port 3001</code>.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <Button className="mt-6" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <CatalogContext value={catalog}>
      <Outlet />
    </CatalogContext>
  )
}
