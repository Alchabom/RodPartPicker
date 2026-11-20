import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Outlet } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '@hooks/auth'
import { AppRoutes } from './AppRoutes'

vi.mock('@hooks/auth', () => ({ useAuth: vi.fn() }))
// Markers stand in for the builder's pages, and its layout and provider just render
// their child route, so this checks only which page each URL reaches
vi.mock('@features/builder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/builder')>()),
  BuilderLayout: () => <Outlet />,
  LocalBuildProvider: () => <Outlet />,
  BrandPartsPage: () => <p>Brand parts page</p>,
  RodSeriesPage: () => <p>Rod series page</p>,
}))

function renderAt(path: string) {
  vi.mocked(useAuth).mockReturnValue({ status: 'anonymous', user: null } as unknown as ReturnType<typeof useAuth>)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('rod route', () => {
  it('sends rods to the rod series page', () => {
    renderAt('/builder/rod/sage')
    expect(screen.getByText('Rod series page')).toBeInTheDocument()
  })

  it('keeps every other component on the brand parts page', () => {
    renderAt('/builder/reel/lamson')
    expect(screen.getByText('Brand parts page')).toBeInTheDocument()
  })
})
