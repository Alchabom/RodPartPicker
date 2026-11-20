import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { listBuilds, type SavedBuild } from '../api/builds'
import { CatalogContext } from '../hooks/catalogContext'
import type { Catalog } from '../types'
import { MyBuildsPage } from './MyBuildsPage'

vi.mock('../api/builds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/builds')>()),
  listBuilds: vi.fn(),
}))

const catalog: Catalog = {
  getBrand: () => undefined,
  getPart: () => undefined,
  getBrandsFor: () => [],
  getParts: () => [],
}

const base = { rodId: null, reelId: null, flyLineId: null, leaderId: null, tippetId: null }
const rows: SavedBuild[] = [
  { ...base, id: 1, name: 'Creek', publishedId: 9, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { ...base, id: 2, name: 'Lake', publishedId: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]

async function setup() {
  vi.mocked(listBuilds).mockResolvedValue(rows)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CatalogContext value={catalog}>
          <MyBuildsPage />
        </CatalogContext>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const creek = (await screen.findByText('Creek')).closest('tr') as HTMLElement
  const lake = screen.getByText('Lake').closest('tr') as HTMLElement
  return { creek, lake }
}

describe('MyBuildsPage', () => {
  it('shows the heading and description', async () => {
    await setup()
    expect(screen.getByRole('heading', { name: 'My builds' })).toBeInTheDocument()
    expect(screen.getByText('Only you can see these. Post one to the Rack to share it.')).toBeInTheDocument()
  })

  it('shows Rack status and Share only for posted builds', async () => {
    const { creek, lake } = await setup()
    expect(within(creek).getByRole('link', { name: 'On the Rack' })).toHaveAttribute('href', '/rack/9')
    expect(within(creek).getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(within(lake).getByText('Private')).toBeInTheDocument()
    expect(within(lake).queryByRole('button', { name: 'Share' })).toBeNull()
  })

  it('words the delete dialog by Rack status', async () => {
    const { creek, lake } = await setup()
    await userEvent.click(within(creek).getByRole('button', { name: 'Delete' }))
    expect(
      await screen.findByText(
        "This build is on the Community Rack. Deleting it leaves the Rack copy up, and you won't be able to take it down. Take it off the Rack first. This can't be undone.",
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(within(lake).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText("This can't be undone.")).toBeInTheDocument()
  })
})
