import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentType, Part } from '../types'
import { BrandPartsPage } from './BrandPartsPage'

function part(component: ComponentType, dbId: number, name: string): Part {
  return {
    id: `${component}-${dbId}`,
    dbId,
    component,
    brandId: 'rio',
    name,
    price: 99,
    purchaseUrl: null,
    imageUrl: null,
    specs: {},
  }
}

const ROD = part('rod', 9, 'R8 Core 590-4')
const LINES = [part('line', 1, 'Elite Gold'), part('line', 2, 'Avid Trout-Gold'), part('line', 3, 'Flats Pro (Float)')]

// A rod is in the build, so the lines page shows which lines fit it
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({ build: { rod: 'rod-9' }, basePath: '/builder', selectPart: vi.fn() }),
}))
vi.mock('../hooks/useBuildQuery', () => ({ useBuildQuery: () => ({ query: 'rodId=9' }) }))
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getBrand: () => ({ id: 'rio', name: 'RIO' }),
    getPart: (id: string | undefined) => (id === ROD.id ? ROD : undefined),
    getParts: (component: ComponentType) => (component === 'line' ? LINES : []),
  }),
}))
vi.mock('../api/compatibility', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/compatibility')>()),
  fetchCompatibleParts: async () => {
    const none = { rod: new Set(), reel: new Set(), line: new Set(), leader: new Set(), tippet: new Set() }
    return {
      matches: { ...none, line: new Set([1, 2]) },
      recommendedLines: new Set([1]),
      heavierLines: new Set(),
      notCompatible: none,
    }
  },
}))

function renderLines() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/builder/line/rio']}>
        <Routes>
          <Route path="/builder/:component/:brand" element={<BrandPartsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BrandPartsPage highlights', () => {
  it('marks fitting parts in stream blue, not the old orange', async () => {
    renderLines()

    const fits = await screen.findAllByText('Fits build')
    expect(fits).toHaveLength(2)
    const row = fits[0].closest('tr')!
    expect(row.className).toMatch(/\bbg-fit\//)
    expect(row.className).not.toMatch(/sulu/)
    expect(fits[0].closest('[data-slot="badge"]')!.className).toMatch(/bg-fit-wash text-fit-ink/)

    const banner = screen.getByText(/match your build/)
    expect(banner.className).toMatch(/border-fit/)
    expect(banner.className).not.toMatch(/sulu/)
  })

  it('marks Recommended in brook-trout gold', async () => {
    renderLines()

    const recommended = await screen.findByText('Recommended')
    expect(recommended.closest('[data-slot="badge"]')!.className).toMatch(/bg-recommended-wash text-recommended-ink/)
  })

  it('leaves parts that do not fit unmarked', async () => {
    renderLines()
    await screen.findAllByText('Fits build')

    const row = screen.getByText('Flats Pro (Float)').closest('tr')!
    expect(row.className).not.toMatch(/bg-fit/)
  })
})
