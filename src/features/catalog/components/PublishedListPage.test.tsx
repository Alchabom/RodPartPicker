import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PublishedListPage } from './PublishedListPage'

vi.mock('@/lib/published', () => ({
  listPublished: vi.fn(() => new Promise(() => {})),
}))

describe('PublishedListPage', () => {
  it('shows card skeletons while the builds load', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/rack']}>
          <PublishedListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Community Rack' })).toBeInTheDocument()
    expect(screen.getByText('Builds posted by anglers on RodPartPicker. Copy any one into your Builder.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading builds')
    expect(screen.getAllByTestId('build-card-skeleton')).toHaveLength(6)
    expect(screen.queryByText('Loading builds…')).toBeNull()
  })
})
