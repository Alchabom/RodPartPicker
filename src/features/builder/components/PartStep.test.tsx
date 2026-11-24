import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompatibleParts } from '../api/compatibility'
import { getComponentInfo } from '../api/components'
import type { Brand, Build, ComponentType, Part } from '../types'
import { PartGroups } from './PartGroups'
import { PartStep } from './PartStep'

function part(component: ComponentType, dbId: number, name: string, extra: Partial<Part> = {}): Part {
  return {
    id: `${component}-${dbId}`,
    dbId,
    component,
    brandId: 'rio',
    name,
    price: 99,
    purchaseUrl: null,
    imageUrl: null,
    specs: { 'Line Wt': '5 wt' },
    ...extra,
  }
}

const ROD = part('rod', 9, 'R8 Core 590-4')
const PARTS: Part[] = [
  part('line', 1, 'Elite Gold'),
  part('line', 2, 'Avid Trout-Gold'),
  part('line', 3, 'Flats Pro'),
  part('line', 4, 'Mystery Line'),
  part('line', 5, 'Heavy Cheap', { price: 40 }),
  part('line', 6, 'Heavy Dear', { price: 140 }),
  part('reel', 11, 'Liquid S', { brandId: 'lamson', imageUrl: '/parts/reels/liquid.webp' }),
  part('reel', 12, 'Remix S', { brandId: 'lamson' }),
  part('reel', 13, 'Orvis Clearwater', { brandId: 'orvis' }),
  part('leader', 21, 'Trout Leader', { imageUrl: '/parts/leaders/trout.webp' }),
  part('tippet', 31, 'Bare Tippet'),
]
const BRANDS: Record<string, Brand> = {
  rio: { id: 'rio', name: 'RIO' },
  lamson: { id: 'lamson', name: 'Lamson' },
  orvis: { id: 'orvis', name: 'Orvis' },
}

let build: Build
const selectPart = vi.fn()
const removePart = vi.fn()
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({ build, basePath: '/builder', kind: 'draft', selectPart, removePart }),
}))
vi.mock('../hooks/useBuildQuery', () => ({ useBuildQuery: () => ({ query: 'rodId=9', selectedCount: 1 }) }))
vi.mock('../hooks/useBuildCheck', () => ({ useBuildCheck: () => ({ flags: { byPart: {}, buildWide: [] }, failed: false }) }))
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getBrand: (id: string) => BRANDS[id],
    getPart: (id: string | undefined) => [ROD, ...PARTS].find((p) => p.id === id),
    getBrandsFor: (c: ComponentType) => [...new Set(PARTS.filter((p) => p.component === c).map((p) => p.brandId))].map((id) => BRANDS[id]),
    getParts: (c: ComponentType, brandId: string) => PARTS.filter((p) => p.component === c && (brandId === 'all' || p.brandId === brandId)),
  }),
}))

const none = () => ({ rod: new Set<number>(), reel: new Set<number>(), line: new Set<number>(), leader: new Set<number>(), tippet: new Set<number>() })
const COMPATIBLE: CompatibleParts = {
  matches: { ...none(), line: new Set([1, 2]) },
  recommendedLines: new Set([1]),
  heavierLines: new Set([6, 5]),
  notCompatible: { ...none(), line: new Set([3]) },
}
const fetchCompatibleParts = vi.fn()
vi.mock('../api/compatibility', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/compatibility')>()),
  fetchCompatibleParts: (...args: unknown[]) => fetchCompatibleParts(...args),
}))

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="at">{pathname + search}</p>
}

function renderStep(path: string) {
  const type = path.split('?')[0].split('/')[2] as Exclude<ComponentType, 'rod'>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/builder/:step" element={<><PartStep type={type} /><Where /></>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const section = (heading: RegExp) => screen.getByRole('heading', { name: heading }).closest('section')!

beforeEach(() => {
  build = { rod: ROD.id }
  selectPart.mockClear()
  removePart.mockClear()
  fetchCompatibleParts.mockReset().mockResolvedValue(COMPATIBLE)
})

describe('PartStep', () => {
  it('groups lines by fit with counts, and keeps the misfits collapsed but choosable', async () => {
    renderStep('/builder/line')
    await screen.findByRole('heading', { name: /Fits your rig/ })
    expect(screen.getByRole('heading', { name: 'Fits your rig (3)' })).toBeInTheDocument()
    expect(within(section(/Fits your rig/)).getAllByRole('listitem').map((li) => li.querySelector('p')!.firstChild!.textContent)).toEqual([
      'Elite Gold',
      'Avid Trout-Gold',
      'Mystery Line',
    ])
    const toggle = screen.getByRole('button', { name: /Doesn't fit your rig \(1\)/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Flats Pro')).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Choose RIO Flats Pro' })).toBeInTheDocument()
  })

  it('shows the heavier-line group cheapest first', async () => {
    renderStep('/builder/line')
    await screen.findByRole('heading', { name: /One weight up/ })
    expect(within(section(/One weight up/)).getAllByRole('button', { name: /^Choose/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Choose RIO Heavy Cheap',
      'Choose RIO Heavy Dear',
    ])
  })

  it('labels only recommended lines Best match', async () => {
    renderStep('/builder/line')
    const best = await screen.findAllByText('Best match')
    expect(best).toHaveLength(1)
    expect(best[0].closest('li')).toHaveTextContent('Elite Gold')
  })

  it('names what the step is matched to', async () => {
    renderStep('/builder/line')
    expect(screen.getByText('Matched to your RIO R8 Core 590-4 · 5 wt')).toBeInTheDocument()
  })

  it('hides brand chips when the part has one brand', () => {
    renderStep('/builder/line')
    expect(screen.queryByRole('navigation', { name: 'Brands' })).toBeNull()
  })

  it('filters by ?brand=', async () => {
    renderStep('/builder/reel?brand=orvis')
    const chips = screen.getByRole('navigation', { name: 'Brands' })
    expect(within(chips).getByRole('link', { name: 'Orvis' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Orvis Clearwater')).toBeInTheDocument()
    expect(screen.queryByText('Liquid S')).toBeNull()
  })

  it('shows skeletons while it checks what fits', () => {
    fetchCompatibleParts.mockReturnValue(new Promise(() => {}))
    renderStep('/builder/line')
    expect(screen.getAllByTestId('part-row-skeleton')).toHaveLength(5)
  })

  it('falls back to a plain list when the check fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchCompatibleParts.mockRejectedValue(new Error('down'))
    renderStep('/builder/line')
    expect(await screen.findByText("Couldn't check what fits")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Fits your rig/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Choose RIO Flats Pro' }))
    expect(selectPart).toHaveBeenCalledWith('line', 'line-3')
  })

  it('chooses a part and stays on the step', async () => {
    renderStep('/builder/line')
    fireEvent.click(await screen.findByRole('button', { name: 'Choose RIO Elite Gold' }))
    expect(selectPart).toHaveBeenCalledWith('line', 'line-1')
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/line')
  })

  it('moves on from the rig column, and skips an empty step', () => {
    renderStep('/builder/line')
    // The reel is empty too, but Skip moves forward through the rig first
    fireEvent.click(screen.getAllByRole('button', { name: 'Skip to leader' })[0])
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/leader')
  })

  it('shows your pick in the rig column, with Remove', () => {
    build = { rod: ROD.id, line: 'line-2' }
    renderStep('/builder/line')
    const rig = screen.getAllByRole('navigation', { name: 'Your rig' })[0]
    expect(within(rig).getByText('RIO Avid Trout-Gold')).toBeInTheDocument()
    fireEvent.click(within(rig).getByRole('button', { name: 'Remove line' }))
    expect(removePart).toHaveBeenCalledWith('line')
  })

  it('keeps focus on the chosen part, now Selected', async () => {
    build = { rod: ROD.id, line: 'line-2' }
    renderStep('/builder/line')
    const selected = await screen.findByRole('button', { name: /Selected/ })
    expect(selected).toHaveAttribute('aria-disabled', 'true')
    expect(selected).not.toBeDisabled()
  })

  it('lays reel specs out in columns', () => {
    fetchCompatibleParts.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <PartGroups component={getComponentInfo('reel')!} parts={[part('reel', 11, 'Liquid S', { specs: { 'Line Wt': '4–6 wt', Water: 'Freshwater' } })]} compatible={undefined} status="off" selectedId={undefined} onChoose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Line weight:').parentElement).toHaveTextContent('4–6 wt')
    expect(screen.getByText('Water:').parentElement).toHaveTextContent('Freshwater')
  })

  it('opens the questionnaire from Help me choose', () => {
    renderStep('/builder/line')
    fireEvent.click(screen.getByRole('button', { name: 'Help me choose' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a photo on each reel row, enlargeable when there is one', () => {
    fetchCompatibleParts.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <PartGroups component={getComponentInfo('reel')!} parts={PARTS.filter((p) => p.component === 'reel')} compatible={undefined} status="off" selectedId={undefined} onChoose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Enlarge photo of Lamson Liquid S' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Reel' }).length).toBeGreaterThan(0)
  })

  it("labels a missing photo with the part's kind", () => {
    render(
      <MemoryRouter>
        <PartGroups component={getComponentInfo('tippet')!} parts={PARTS.filter((p) => p.component === 'tippet')} compatible={undefined} status="off" selectedId={undefined} onChoose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: 'Tippet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enlarge photo/ })).toBeNull()
  })

  it('says so when there are no parts at all', () => {
    render(
      <MemoryRouter>
        <PartGroups component={getComponentInfo('leader')!} parts={[]} compatible={undefined} status="off" selectedId={undefined} onChoose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText("We don't have any leaders yet.")).toBeInTheDocument()
  })

  it('makes the misfit group a heading, like the others', async () => {
    renderStep('/builder/line')
    expect(await screen.findByRole('heading', { name: /Doesn't fit your rig/ })).toBeInTheDocument()
  })

  it('shows one plain list when fit does not apply', () => {
    render(
      <MemoryRouter>
        <PartGroups component={getComponentInfo('line')!} parts={PARTS.filter((p) => p.component === 'line')} compatible={undefined} status="off" selectedId="line-2" onChoose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('button', { name: /Selected/ })).toHaveAttribute('aria-disabled', 'true')
  })
})
