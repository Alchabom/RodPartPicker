import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PublishedBuildPage } from './PublishedBuildPage'

vi.mock('@/lib/published', () => ({
  getPublished: vi.fn(() => new Promise(() => {})),
}))

describe('PublishedBuildPage', () => {
  it('shows a skeleton while the build loads', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/rack/5']}>
          <Routes>
            <Route path="/rack/:id" element={<PublishedBuildPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading build')
    expect(screen.queryByText('Loading build…')).toBeNull()
  })
})
