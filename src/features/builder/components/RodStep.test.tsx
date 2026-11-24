import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RodSeries } from '../api/rodSeries'
import { RodStep } from './RodStep'

const fetchRodSeries = vi.fn()
vi.mock('../api/rodSeries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/rodSeries')>()),
  fetchRodSeries: (...args: unknown[]) => fetchRodSeries(...args),
}))

const selectPart = vi.fn()
const clearBuild = vi.fn()
const loadRecommendation = vi.fn()
const removePart = vi.fn()
let buildRod: string | undefined
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({
    build: { rod: buildRod },
    basePath: '/builder',
    kind: 'draft',
    selectPart,
    clearBuild,
    loadRecommendation,
    removePart,
  }),
}))
const BRANDS = [
  { id: 'orvis', name: 'Orvis' },
  { id: 'sage', name: 'Sage' },
]
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getBrand: (id: string) => BRANDS.find((b) => b.id === id),
    getBrandsFor: () => BRANDS,
    getPart: (id: string | undefined) => (id ? { id, brandId: 'sage', name: 'R8 Core 590-4', price: 1100, specs: {} } : undefined),
  }),
}))
vi.mock('../hooks/useBuildCheck', () => ({ useBuildCheck: () => ({ flags: { byPart: {}, buildWide: [] }, failed: false }) }))
const getRecommendation = vi.fn()
vi.mock('../api/questionnaire', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/questionnaire')>()),
  getRecommendation: (...args: unknown[]) => getRecommendation(...args),
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

function Where() {
  return <p data-testid="at">{useLocation().pathname}</p>
}

function renderAt(path = '/builder/rod?brand=sage', state?: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }]}>
        <Routes>
          <Route path="/builder/rod" element={<RodStep />} />
          <Route path="*" element={<Where />} />
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
    clearBuild.mockReset()
    loadRecommendation.mockReset()
    getRecommendation.mockReset()
    buildRod = undefined
  })

  it('loads the brand from the URL and shows one closed row per series', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    expect(await screen.findByRole('button', { name: /^R8 Core/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Choose a rod' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sage' })).toHaveAttribute('aria-current', 'page')
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
    expect(screen.getByRole('button', { name: /Selected/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('chooses a size and stays on the rod step', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /^R8 Core/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Sage R8 Core 590-4' }))

    expect(selectPart).toHaveBeenCalledWith('rod', 'rod-52')
    // Still on the rod step: the harness only shows where it is on other routes
    expect(screen.getByRole('heading', { name: 'Choose a rod' })).toBeInTheDocument()
    expect(screen.queryByTestId('at')).not.toBeInTheDocument()
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

  it('shows every brand for a brand it does not know', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt('/builder/rod?brand=nope')

    expect(await screen.findByRole('button', { name: /^R8 Core/ })).toBeInTheDocument()
    expect(fetchRodSeries).toHaveBeenCalledWith('all', expect.anything())
  })

  it("says so when there are no rods", async () => {
    fetchRodSeries.mockResolvedValue([])
    renderAt()

    expect(await screen.findByText("We don't have any rods for that brand.")).toBeInTheDocument()
  })

  it('groups all brands under their own headings', async () => {
    fetchRodSeries.mockResolvedValue([
      series(4, 'Clearwater', [81], { brand: { name: 'Orvis', slug: 'orvis' } }),
      ...SAGE,
    ])
    renderAt('/builder/rod')

    expect(await screen.findByRole('heading', { name: 'Orvis' })).toBeInTheDocument()
    expect(fetchRodSeries).toHaveBeenCalledWith('all', expect.anything())
    expect(screen.getByRole('heading', { name: 'Orvis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sage' })).toBeInTheDocument()
  })

  it('shows your rod with Remove', async () => {
    buildRod = 'rod-52'
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()
    await screen.findByRole('button', { name: /^R8 Core/ })

    const rig = screen.getAllByRole('navigation', { name: 'Your rig' })[0]
    expect(within(rig).getByText('Sage R8 Core 590-4')).toBeInTheDocument()
    await userEvent.click(within(rig).getByRole('button', { name: 'Remove rod' }))
    expect(removePart).toHaveBeenCalledWith('rod')
  })

  it('explains why it opened when a later step needed a rod', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt('/builder/rod', { needsRod: true })

    expect(screen.getByText('Pick a rod first: everything else is matched to it.')).toHaveAttribute('role', 'status')
  })

  it('offers Help me choose beside the title', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()
    await screen.findByRole('button', { name: /^R8 Core/ })
    expect(screen.getByRole('button', { name: 'Help me choose' })).toBeInTheDocument()
  })

  it('moves on to the reel from the rig column once a rod is in', async () => {
    buildRod = 'rod-52'
    fetchRodSeries.mockResolvedValue(SAGE)
    renderAt()
    await screen.findByRole('button', { name: /^R8 Core/ })
    await userEvent.click(screen.getAllByRole('button', { name: 'Next: reel' })[0])
    expect(await screen.findByTestId('at')).toHaveTextContent('/builder/reel')
  })

  async function answerEverything() {
    await userEvent.click(screen.getByRole('button', { name: 'Help me choose' }))
    // Pick the first answer that can be picked, question after question
    for (let i = 0; i < 5; i++) {
      const dialog = screen.queryByRole('dialog')
      if (!dialog) break
      const option = within(dialog).queryAllByRole('button').find((b) => !b.hasAttribute('disabled') && !/Back|Close/.test(b.textContent ?? ''))
      if (!option) break
      await userEvent.click(option)
    }
  }

  it('rigs a whole setup from the questions and lands on the summary', async () => {
    fetchRodSeries.mockResolvedValue(SAGE)
    getRecommendation.mockResolvedValue([{ component: 'rod', partId: 'rod-52', reason: 'why' }])
    renderAt()
    await screen.findByRole('button', { name: /^R8 Core/ })

    await answerEverything()

    expect(loadRecommendation).toHaveBeenCalled()
    expect(await screen.findByTestId('at')).toHaveTextContent(/^\/builder$/)
  })

  it('stays put and shows the error when the questions fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchRodSeries.mockResolvedValue(SAGE)
    getRecommendation.mockRejectedValue(new Error('down'))
    renderAt()
    await screen.findByRole('button', { name: /^R8 Core/ })

    await answerEverything()

    expect(await screen.findByText("Couldn't get a recommendation")).toBeInTheDocument()
    expect(screen.queryByTestId('at')).toBeNull()
  })
})
