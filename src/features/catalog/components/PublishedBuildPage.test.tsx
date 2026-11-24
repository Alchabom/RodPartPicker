import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('offers a Buy button for each part with a shop link', async () => {
    vi.mocked(getPublished).mockResolvedValueOnce({
      id: 5,
      title: 'Creek',
      author: 'Sam',
      rod: null,
      totalPrice: 159,
      publishedAt: '2026-01-01T00:00:00Z',
      writeup: 'x',
      updatedAt: '2026-01-01T00:00:00Z',
      parts: {
        rod: null,
        reel: { id: 1, brand: 'Lamson', name: 'Liquid S', price: 159, purchaseUrl: 'https://shop.example/reel' },
        line: { id: 2, brand: 'RIO', name: 'Elite Gold', price: 129, purchaseUrl: null },
        leader: null,
        tippet: null,
      },
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
    const buy = await screen.findByRole('link', { name: 'Buy Lamson Liquid S' })
    expect(buy).toHaveAttribute('href', 'https://shop.example/reel')
    expect(buy).toHaveAttribute('data-slot', 'button')
    expect(screen.queryByRole('link', { name: 'Buy RIO Elite Gold' })).toBeNull()
  })

  const BUILD = {
    id: 5,
    title: 'Creek',
    author: 'Sam',
    rod: null,
    totalPrice: 0,
    publishedAt: '2026-01-01T00:00:00Z',
    writeup: 'x',
    updatedAt: '2026-01-01T00:00:00Z',
    parts: { rod: null, reel: null, line: null, leader: null, tippet: null },
  }

  function renderFrom(entries: Parameters<typeof MemoryRouter>[0]['initialEntries'], initialIndex = 0) {
    vi.mocked(getPublished).mockResolvedValueOnce(BUILD)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
          <Routes>
            <Route path="/rack" element={<p>Rack list</p>} />
            <Route path="/rack/:id" element={<PublishedBuildPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('goes back to the filtered list it came from', async () => {
    renderFrom(['/rack?brand=sage', { pathname: '/rack/5', state: { from: '/rack?brand=sage' } }], 1)
    const back = await screen.findByRole('link', { name: 'Community Rack' })
    expect(back).toHaveAttribute('href', '/rack?brand=sage')
    fireEvent.click(back)
    expect(await screen.findByText('Rack list')).toBeInTheDocument()
  })

  it('links to the Rack when opened directly', async () => {
    renderFrom(['/rack/5'])
    const back = await screen.findByRole('link', { name: 'Community Rack' })
    expect(back).toHaveAttribute('href', '/rack')
    fireEvent.click(back)
    expect(await screen.findByText('Rack list')).toBeInTheDocument()
  })

  it('puts Open in Builder and Share in the header', async () => {
    renderFrom(['/rack/5'])
    const heading = await screen.findByRole('heading', { level: 1, name: 'Creek' })
    const header = heading.parentElement!.parentElement!
    expect(header).toContainElement(screen.getByRole('link', { name: 'Open in Builder' }))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Share' }))
  })
})
