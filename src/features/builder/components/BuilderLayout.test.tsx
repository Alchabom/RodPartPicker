import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { BuilderLayout } from './BuilderLayout'

vi.mock('../api/parts', () => ({
  catalogKey: ['catalog'],
  fetchCatalog: vi.fn(() => new Promise(() => {})),
}))

describe('BuilderLayout', () => {
  it('shows the builder skeleton while the parts load', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BuilderLayout />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading parts')
    expect(screen.getAllByTestId('builder-skeleton-row')).toHaveLength(5)
    expect(screen.queryByText('Loading parts…')).toBeNull()
  })
})
