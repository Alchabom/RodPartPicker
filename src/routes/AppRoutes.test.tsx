import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '@hooks/auth'
import { AppRoutes } from './AppRoutes'

vi.mock('@hooks/auth', () => ({ useAuth: vi.fn() }))
// The parts catalog never loads: the redirect must not wait for it.
vi.mock('@features/builder/api/parts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/builder/api/parts')>()),
  fetchCatalog: () => new Promise(() => {}),
}))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

describe('AppRoutes', () => {
  it('redirects /builder/saved to /my-builds without waiting for the parts catalog', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'anonymous', user: null } as unknown as ReturnType<typeof useAuth>)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/builder/saved']}>
          <Where />
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    // /my-builds itself waits for the catalog, so landing there proves the redirect did not
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/my-builds$/)
  })
})
