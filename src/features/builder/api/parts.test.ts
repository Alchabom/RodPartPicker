import { describe, expect, it, vi } from 'vitest'
import { NONE } from '../utils/format'
import { fetchCatalog } from './parts'

const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

describe('fetchCatalog', () => {
  it('maps a tippet with no X size (wire) and shows its strength', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/parts/tippet'
          ? [
              {
                id: 7,
                brand: 'RIO',
                model: 'Powerflex Wire Bite Tippet',
                material: 'wire',
                water: 'both',
                xSize: null,
                strengthLb: 30,
                spoolYards: 5,
                price: 19.99,
                purchaseUrl: null,
                imageUrl: null,
              },
            ]
          : [],
      ),
    )

    const catalog = await fetchCatalog()
    const tippet = catalog.getParts('tippet', 'all')[0]

    expect(tippet.specs).toMatchObject({ 'X-Size': NONE, Material: 'Wire', 'Test (lb)': '30' })
  })
})
