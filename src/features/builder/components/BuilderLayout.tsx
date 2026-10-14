import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { fetchCatalog } from '../api/parts'
import { CatalogContext } from '../hooks/catalogContext'
import type { Catalog } from '../types'

type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: Catalog }

// Route layout for /builder/*: loads the parts catalog once, then renders
// the child route with the catalog available through useCatalog().
export function BuilderLayout() {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalog(controller.signal)
      .then((catalog) => setState({ status: 'ready', catalog }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => controller.abort()
  }, [attempt])

  if (state.status === 'loading') {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading parts…</p>
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-te-papa-green">Couldn't load parts</h1>
        <p className="mt-2 text-muted-foreground">
          Is the API running? Start it with <code>pnpm dev:server</code>.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{state.message}</p>
        <Button
          className="mt-6"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <CatalogContext value={state.catalog}>
      <Outlet />
    </CatalogContext>
  )
}
