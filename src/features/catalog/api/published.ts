// Public published-builds routes (/api/published). No sign-in needed.
import { apiFetch } from '@/lib/api'
import type { CatalogParams } from '@/lib/publishedKeys'
import type { PublishedBuild, PublishedList } from '../types'

export function listPublished(params: CatalogParams, signal?: AbortSignal): Promise<PublishedList> {
  const query = new URLSearchParams({ page: String(params.page) })
  if (params.weight !== undefined) query.set('weight', String(params.weight))
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice))
  return apiFetch<PublishedList>(`/published?${query}`, { signal })
}

export function getPublished(id: number, signal?: AbortSignal): Promise<PublishedBuild> {
  return apiFetch<PublishedBuild>(`/published/${id}`, { signal })
}
