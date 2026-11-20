import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getPublished } from '@/lib/published'
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

  it('offers Open in Builder and Share once loaded', async () => {
    vi.mocked(getPublished).mockResolvedValueOnce({
      id: 5,
      title: 'Creek',
      author: 'Sam',
      rod: null,
      totalPrice: 0,
      publishedAt: '2026-01-01T00:00:00Z',
      writeup: 'x',
      updatedAt: '2026-01-01T00:00:00Z',
      parts: { rod: null, reel: null, line: null, leader: null, tippet: null },
    })
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
    expect(await screen.findByRole('link', { name: 'Open in Builder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })
})
