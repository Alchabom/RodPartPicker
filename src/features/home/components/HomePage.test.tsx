import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

vi.mock('@/lib/published', () => ({
  listPublished: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
}))

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  it('shows the headline and both actions', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: 'Rig a fly rod where every part fits' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Start a build' })[0]).toHaveAttribute('href', '/builder')
    expect(screen.getByRole('link', { name: 'See completed builds' })).toHaveAttribute('href', '/builds')
  })

  it('lists the five rig steps in order', () => {
    renderHome()
    const steps = within(screen.getByRole('list', { name: 'How a rig goes together' })).getAllByRole('listitem')
    expect(steps.map((s) => s.querySelector('h3')?.textContent)).toEqual(['Rod', 'Reel', 'Line', 'Leader', 'Tippet'])
  })

  it('only animates the entrance when motion is allowed', () => {
    renderHome()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.className).toContain('motion-safe:animate-rise')
    expect(h1.className).not.toMatch(/(^|\s)animate-rise/)
    expect(h1.className).not.toMatch(/(^|\s)opacity-0/)
  })
})
