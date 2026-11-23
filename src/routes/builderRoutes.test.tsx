import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { MemoryRouter, Outlet, useLocation, useNavigate, type NavigateFunction } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@hooks/auth'
import { AppRoutes } from './AppRoutes'

vi.mock('@hooks/auth', () => ({ useAuth: vi.fn() }))

// The layout and providers just render their child route, with a build whose
// base path follows the URL; the step pages are markers. This checks only
// which page, and which URL, each builder link reaches
let build: Record<string, string> = {}
let basePath = '/builder'
vi.mock('@features/builder/hooks/useBuild', () => ({ useBuild: () => ({ build, basePath }) }))
vi.mock('@features/builder/hooks/useCatalog', () => ({
  useCatalog: () => ({ getPart: (id: string | undefined) => (id ? { id } : undefined) }),
}))
vi.mock('@features/builder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/builder')>()),
  BuilderLayout: () => <Outlet />,
  LocalBuildProvider: () => <Outlet />,
  SavedBuildProvider: () => <Outlet />,
}))
vi.mock('@features/builder/components/RodStep', () => ({ RodStep: () => <p>Rod step</p> }))
vi.mock('@features/builder/components/PartStep', () => ({ PartStep: ({ type }: { type: string }) => <p>Part step: {type}</p> }))
vi.mock('@features/builder/components/RigSummary', () => ({ RigSummary: () => <p>Summary</p> }))

let navigate: NavigateFunction
function Where() {
  const location = useLocation()
  const nav = useNavigate()
  useEffect(() => {
    navigate = nav
  })
  return (
    <>
      <p data-testid="at">{location.pathname + location.search}</p>
      <p data-testid="state">{JSON.stringify(location.state)}</p>
    </>
  )
}

function renderAt(path: string) {
  // A saved build's provider would set its own base path
  basePath = /^\/builder\/\d+/.exec(path)?.[0] ?? '/builder'
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { displayName: 'A' } } as unknown as ReturnType<typeof useAuth>)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const at = () => screen.getByTestId('at')

beforeEach(() => {
  build = {}
})

describe('builder routes', () => {
  it('starts an empty build at the rod step', () => {
    renderAt('/builder')
    expect(screen.getByText('Rod step')).toBeInTheDocument()
    expect(at()).toHaveTextContent(/^\/builder\/rod$/)
  })

  it('shows the summary once the build has a rod', () => {
    build = { rod: 'rod-1' }
    renderAt('/builder')
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('keeps the summary for a ?copy= intent, even after the param is stripped', () => {
    renderAt('/builder?copy=5')
    expect(screen.getByText('Summary')).toBeInTheDocument()
    act(() => {
      navigate('/builder', { replace: true })
    })
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(at()).toHaveTextContent(/^\/builder$/)
  })

  it('stays on the summary when the build is emptied there (save, retake, start over)', () => {
    build = { rod: 'rod-1' }
    renderAt('/builder')
    build = {}
    act(() => {
      navigate('/builder?again=1', { replace: true })
    })
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(at()).toHaveTextContent(/^\/builder\?again=1$/)
  })

  it('sends a later step to the rod step, saying why, when there is no rod', () => {
    renderAt('/builder/reel')
    expect(screen.getByText('Rod step')).toBeInTheDocument()
    expect(at()).toHaveTextContent(/^\/builder\/rod$/)
    expect(screen.getByTestId('state')).toHaveTextContent('{"needsRod":true}')
  })

  it('opens a later step once there is a rod', () => {
    build = { rod: 'rod-1' }
    renderAt('/builder/leader')
    expect(screen.getByText('Part step: leader')).toBeInTheDocument()
  })

  it.each([
    ['/builder/reel/lamson', '/builder/reel?brand=lamson'],
    ['/builder/rod/sage', '/builder/rod?brand=sage'],
    ['/builder/line/all', '/builder/line'],
  ])('redirects the old link %s to %s', (from, to) => {
    build = { rod: 'rod-1' }
    renderAt(from)
    expect(at()).toHaveTextContent(new RegExp(`^${to.replace(/[?]/g, '\\?')}$`))
  })

  it('keeps a saved build at /builder/:id, with its steps under it', () => {
    build = { rod: 'rod-1' }
    renderAt('/builder/42')
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(at()).toHaveTextContent(/^\/builder\/42$/)
  })

  it('opens a saved build step', () => {
    build = { rod: 'rod-1' }
    renderAt('/builder/42/line')
    expect(screen.getByText('Part step: line')).toBeInTheDocument()
  })

  it("redirects a saved build's old link", () => {
    build = { rod: 'rod-1' }
    renderAt('/builder/42/rod/sage')
    expect(at()).toHaveTextContent(/^\/builder\/42\/rod\?brand=sage$/)
  })

  it('does not know an unknown part', () => {
    renderAt('/builder/bogus/thing')
    expect(screen.getByText("We couldn't find that part of the builder.")).toBeInTheDocument()
  })
})
