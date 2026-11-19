import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listPublished, type PublishedList, type PublishedSummary } from '@/lib/published'
import { RecentBuilds } from './RecentBuilds'

vi.mock('@/lib/published', () => ({ listPublished: vi.fn() }))

const item = (id: number): PublishedSummary => ({
  id,
  title: `Build ${id}`,
  author: 'A',
  rod: null,
  totalPrice: 100,
  publishedAt: '2026-11-18T14:00:00Z',
})
const list = (n: number): PublishedList => ({
  items: Array.from({ length: n }, (_, i) => item(i + 1)),
  page: 1,
  pageSize: 20,
  total: n,
})

function renderRecent(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecentBuilds />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('RecentBuilds', () => {
  it('shows skeletons while loading', () => {
    vi.mocked(listPublished).mockReturnValue(new Promise(() => {}))
    renderRecent()
    expect(screen.getAllByTestId('build-card-skeleton')).toHaveLength(3)
  })

  it('shows at most 3 builds', async () => {
    vi.mocked(listPublished).mockResolvedValue(list(5))
    renderRecent()
    expect(await screen.findAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'See all completed builds' })).toHaveAttribute('href', '/rack')
  })

  it.each([1, 2])('shows exactly %i builds when that is all there is', async (n) => {
    vi.mocked(listPublished).mockResolvedValue(list(n))
    renderRecent()
    expect(await screen.findAllByRole('listitem')).toHaveLength(n)
    expect(screen.queryByText('No builds published yet')).toBeNull()
  })

  it('invites a first build when there are none', async () => {
    vi.mocked(listPublished).mockResolvedValue(list(0))
    renderRecent()
    expect(await screen.findByText('No builds published yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a build' })).toHaveAttribute('href', '/builder')
  })

  it('renders nothing on an error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listPublished).mockRejectedValue(new Error('down'))
    const { container } = renderRecent()
    await waitFor(() => expect(log).toHaveBeenCalledWith('Could not load recent builds', expect.any(Error)))
    expect(container).toBeEmptyDOMElement()
  })

  it('keeps loaded cards when a background refetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(listPublished).mockResolvedValueOnce(list(2))
    renderRecent(queryClient)
    expect(await screen.findAllByRole('listitem')).toHaveLength(2)
    vi.mocked(listPublished).mockRejectedValueOnce(new Error('down'))
    await act(() => queryClient.refetchQueries())
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
