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
