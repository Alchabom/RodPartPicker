import type { CatalogParams } from '@/lib/publishedKeys'

// Bad or missing values mean "no filter" (or page 1), never an error
export function parseCatalogParams(search: URLSearchParams): CatalogParams {
  const page = Number(search.get('page'))
  const weight = Number(search.get('weight'))
  const rawPrice = search.get('maxPrice')
  const maxPrice = rawPrice === null || rawPrice.trim() === '' ? NaN : Number(rawPrice)

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    weight: Number.isInteger(weight) && weight >= 1 && weight <= 15 ? weight : undefined,
    maxPrice: Number.isFinite(maxPrice) && maxPrice >= 0 ? maxPrice : undefined,
  }
}
