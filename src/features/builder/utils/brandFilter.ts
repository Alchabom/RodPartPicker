import type { Brand } from '../types'

/** The ?brand= in the URL when it names one of `brands`, else 'all'. */
export function brandFromSearch(searchParams: URLSearchParams, brands: Brand[]): string {
  const id = searchParams.get('brand')
  return brands.some((b) => b.id === id) ? id! : 'all'
}
