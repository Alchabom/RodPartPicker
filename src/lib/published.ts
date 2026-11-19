// Public published-builds routes (/api/published). No sign-in needed.
import { apiFetch } from '@/lib/api'
import type { CatalogParams } from '@/lib/publishedKeys'

// Mirrors api/app/published/schemas.py (camelCase JSON)
export type Slot = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'

export interface PublishedRod {
  brand: string
  name: string
  lineWeight: number
  imageUrl: string | null
}

export interface PublishedPart {
  id: number
  brand: string
  name: string
  price: number | null
  purchaseUrl: string | null
  imageUrl?: string | null // rod and reel only
}

export interface PublishedSummary {
  id: number
  title: string
  author: string
  rod: PublishedRod | null
  totalPrice: number
  publishedAt: string
}

export interface PublishedBuild extends PublishedSummary {
  writeup: string
  updatedAt: string
  parts: Record<Slot, PublishedPart | null>
}

export interface PublishedList {
  items: PublishedSummary[]
  page: number
  pageSize: number
  total: number
}

export function listPublished(params: CatalogParams, signal?: AbortSignal): Promise<PublishedList> {
  const query = new URLSearchParams({ page: String(params.page) })
  if (params.weight !== undefined) query.set('weight', String(params.weight))
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice))
  return apiFetch<PublishedList>(`/published?${query}`, { signal })
}

export function getPublished(id: number, signal?: AbortSignal): Promise<PublishedBuild> {
  return apiFetch<PublishedBuild>(`/published/${id}`, { signal })
}
