import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentType, Part } from '../types'
import { BrandPartsPage } from './BrandPartsPage'

function part(component: ComponentType, dbId: number, name: string, imageUrl: string | null): Part {
  return {
    id: `${component}-${dbId}`,
    dbId,
    component,
    brandId: 'lamson',
    name,
    price: 199,
    purchaseUrl: null,
    imageUrl,
    specs: {},
  }
}

const PARTS: Part[] = [
  part('reel', 1, 'Liquid S', '/parts/reels/lamson-liquid-s.webp'),
  part('reel', 2, 'Remix S', null),
  part('leader', 3, 'Trout Leader', '/parts/leaders/lamson-trout-leader.webp'),
  part('tippet', 4, 'Bare Tippet', null),
]

vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({ build: {}, basePath: '/builder', selectPart: vi.fn() }),
}))
vi.mock('../hooks/useBuildQuery', () => ({ useBuildQuery: () => ({ query: '' }) }))
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getBrand: (id: string) => (id === 'lamson' ? { id, name: 'Lamson' } : undefined),
    getPart: () => undefined,
    getParts: (component: ComponentType) => PARTS.filter((p) => p.component === component),
  }),
}))

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/builder/:component/:brand" element={<BrandPartsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BrandPartsPage photos', () => {
  it('shows a photo on each reel row, enlargeable when there is one', () => {
    renderAt('/builder/reel/lamson')

    expect(screen.getByRole('button', { name: 'Enlarge photo of Lamson Liquid S' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Reel' })).toBeInTheDocument()
  })

  it('shows enlargeable photos on leader rows too', () => {
    renderAt('/builder/leader/lamson')

    expect(screen.getByRole('button', { name: 'Enlarge photo of Lamson Trout Leader' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Photo' })).toBeInTheDocument()
  })

  it("labels a missing photo with the part's kind", () => {
    renderAt('/builder/tippet/lamson')

    expect(screen.getByRole('img', { name: 'Tippet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enlarge photo/ })).toBeNull()
  })
})
