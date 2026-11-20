import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RodSeries } from '../api/rodSeries'
import { RodSeriesPage } from './RodSeriesPage'

const fetchRodSeries = vi.fn()
vi.mock('../api/rodSeries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/rodSeries')>()),
  fetchRodSeries: (...args: unknown[]) => fetchRodSeries(...args),
}))

const selectPart = vi.fn()
let buildRod: string | undefined
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({ build: { rod: buildRod }, basePath: '/builder', selectPart }),
}))
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({ getBrand: (id: string) => (id === 'sage' ? { id, name: 'Sage' } : undefined) }),
}))

function series(id: number, name: string, sizeIds: number[], extra: Partial<RodSeries> = {}): RodSeries {
  return {
    id,
    slug: name.toLowerCase().replace(/ /g, '-'),
    name,
    brand: { name: 'Sage', slug: 'sage' },
    imageUrl: `/parts/rods/sage-${id}.webp`,
    purchaseUrl: `https://farbank.com/products/${id}`,
    summary: {
      sizeCount: sizeIds.length,
      minLineWeight: 4,
      maxLineWeight: 5,
      minLengthIn: 108,
      maxLengthIn: 108,
      minPrice: 1100,
      maxPrice: 1100,
    },
    sizes: sizeIds.map((sid, i) => ({
      id: sid,
      sizeCode: `${4 + i}90-4`,
      lineWeight: 4 + i,
      lengthIn: 108,
      action: 'fast',
      pieces: 4,
      water: 'fresh',
      price: 1100,
    })),
    ...extra,
  }
}

const SAGE = [series(1, 'R8 Core', [51, 52]), series(2, 'Foundation', [61])]

function renderAt(path = '/builder/rod/sage') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/builder" element={<p>Build page</p>} />
          <Route path="/builder/rod/:brand" element={<RodSeriesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const header = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

describe('RodSeriesPage', () => {
  beforeEach(() => {
    fetchRodSeries.mockReset()
    selectPart.mockReset()
    buildRod = undefined
  })

  it('loads the brand from the URL and shows one closed row per series', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    expect(await screen.findByRole('button', { name: /^R8 Core/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sage rods' })).toBeInTheDocument()
    expect(fetchRodSeries).toHaveBeenCalledWith('sage', expect.anything())
    expect(header('R8 Core')).toHaveAttribute('aria-expanded', 'false')
    expect(header('Foundation')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(`2 sizes · 4–5 wt · 9'0" · $1,100.00`)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('opens a series to show its sizes', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^R8 Core/ }))

    expect(header('R8 Core')).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table')
    expect(within(table).getByText('490-4')).toBeInTheDocument()
    expect(within(table).getByText('590-4')).toBeInTheDocument()
  })

  it("starts with the build's series open and its size selected", async () => {
    buildRod = 'rod-52'
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    expect(await screen.findByRole('button', { name: /^R8 Core/ })).toHaveAttribute('aria-expanded', 'true')
    expect(header('Foundation')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Selected/ })).toBeDisabled()
  })

  it('adds a size and goes back to the build', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^R8 Core/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Sage R8 Core 590-4' }))

    expect(selectPart).toHaveBeenCalledWith('rod', 'rod-52')
    expect(await screen.findByText('Build page')).toBeInTheDocument()
  })

  it('shows a placeholder without an image, and no Buy link without a link', async () => {
    fetchRodSeries.mockResolvedValue([series(3, 'Spey R8', [71], { imageUrl: null, purchaseUrl: null })])
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^Spey R8/ }))

    expect(screen.getAllByRole('img', { name: 'Rod' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /^Buy/ })).toBeNull()
  })

  it('opens the Buy link in a new tab without an opener', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^R8 Core/ }))
    const buy = screen.getByRole('link', { name: 'Buy Sage R8 Core' })

    expect(buy).toHaveAttribute('href', 'https://farbank.com/products/1')
    expect(buy).toHaveAttribute('target', '_blank')
    expect(buy).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows an error with Try again, which fetches again', async () => {
    fetchRodSeries.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(SAGE)
    renderAt()

    expect(await screen.findByText("Couldn't load rods.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /^R8 Core/ })).toBeInTheDocument()
    expect(fetchRodSeries).toHaveBeenCalledTimes(2)
  })

  it("says so when a brand has no rods", async () => {
    fetchRodSeries.mockResolvedValue([])
    renderAt('/builder/rod/nope')

    expect(await screen.findByText("We don't have any rods for that brand.")).toBeInTheDocument()
  })

  it('groups all brands under their own headings', async () => {
    fetchRodSeries.mockResolvedValue([
      series(4, 'Clearwater', [81], { brand: { name: 'Orvis', slug: 'orvis' } }),
      ...SAGE,
    ])
    renderAt('/builder/rod/all')

    expect(await screen.findByRole('heading', { name: 'Orvis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'All rods' })).toBeInTheDocument()
    expect(fetchRodSeries).toHaveBeenCalledWith('all', expect.anything())
    expect(screen.getByRole('heading', { name: 'Orvis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sage' })).toBeInTheDocument()
  })
})
