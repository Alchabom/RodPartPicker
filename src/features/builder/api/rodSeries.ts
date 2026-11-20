// Loads rod series, grouped by the API (GET /api/rods/series), for the rod page
import { apiFetch } from '@/lib/api'
import { formatPrice } from '@utils/formatPrice'
import { formatLength, type Water } from '../utils/format'

// Shapes returned by api/app/rods/schemas.py
export interface RodSize {
  id: number // the rod's id, as in /api/parts/rod
  sizeCode: string | null
  lineWeight: number
  lengthIn: number
  action: 'slow' | 'medium' | 'medium_fast' | 'fast' | null
  pieces: number | null
  water: Water
  price: number
}

export interface RodSeriesSummary {
  sizeCount: number
  minLineWeight: number
  maxLineWeight: number
  minLengthIn: number
  maxLengthIn: number
  minPrice: number
  maxPrice: number
}

export interface RodSeries {
  id: number
  slug: string
  name: string
  brand: { name: string; slug: string }
  imageUrl: string | null
  purchaseUrl: string | null
  summary: RodSeriesSummary
  sizes: RodSize[]
}

export const rodSeriesKeys = {
  list: (brand: string) => ['rodSeries', brand] as const,
}

// `brand` is a brand slug from the URL, or 'all'
export function fetchRodSeries(brand: string, signal?: AbortSignal): Promise<RodSeries[]> {
  const query = brand === 'all' ? '' : `?brand=${encodeURIComponent(brand)}`
  return apiFetch<RodSeries[]>(`/rods/series${query}`, { signal })
}

function range(min: string, max: string): string {
  return min === max ? min : `${min}–${max}`
}

// "19 sizes · 3–9 wt · 8'6"–10'0" · $1,100.00"
export function formatSeriesSummary(s: RodSeriesSummary): string {
  return [
    `${s.sizeCount} ${s.sizeCount === 1 ? 'size' : 'sizes'}`,
    `${range(String(s.minLineWeight), String(s.maxLineWeight))} wt`,
    range(formatLength(s.minLengthIn), formatLength(s.maxLengthIn)),
    range(formatPrice(s.minPrice), formatPrice(s.maxPrice)),
  ].join(' · ')
}
