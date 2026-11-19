import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/published', () => ({
  listPublished: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
}))

// The entrance runs once per page load, so each test gets a fresh module
beforeEach(() => {
  vi.resetModules()
})

async function renderHome() {
  const { HomePage } = await import('./HomePage')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  it('shows the headline and both actions', async () => {
    await renderHome()
    expect(screen.getByRole('heading', { level: 1, name: 'Rig a fly rod where every part fits' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Start a build' })[0]).toHaveAttribute('href', '/builder')
    expect(screen.getByRole('link', { name: 'See completed builds' })).toHaveAttribute('href', '/builds')
  })

  it('lists the five rig steps in order', async () => {
    await renderHome()
    const steps = within(screen.getByRole('list', { name: 'How a rig goes together' })).getAllByRole('listitem')
    expect(steps.map((s) => s.querySelector('h3')?.textContent)).toEqual(['Rod', 'Reel', 'Line', 'Leader', 'Tippet'])
  })

  it('has no sample build card in the hero', async () => {
    await renderHome()
    expect(screen.queryByText('Smokies 4wt')).toBeNull()
    expect(screen.queryByText(/of 5 parts/)).toBeNull()
  })

  it('only animates the entrance when motion is allowed', async () => {
    await renderHome()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.className).toContain('motion-safe:animate-rise')
    expect(h1.className).not.toMatch(/(^|\s)animate-rise/)
    expect(h1.className).not.toMatch(/(^|\s)opacity-0/)
  })

  it('plays the entrance once per visit, not on every return to the page', async () => {
    const first = await renderHome()
    first.unmount()
    const { HomePage } = await import('./HomePage') // same module instance: no reset in between
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('animate-rise')
  })
})
