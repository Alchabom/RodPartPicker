import type { LucideIcon } from 'lucide-react'

export type ComponentType = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'

export interface Brand {
  id: string // URL slug
  name: string
}

export interface Part {
  id: string
  component: ComponentType
  brandId: string
  name: string
  price: number // USD
  specs: Record<string, string> // keys match the component's specColumns
}

export type Build = Partial<Record<ComponentType, Part['id']>>

export interface ComponentInfo {
  type: ComponentType
  label: string // "Rod"
  plural: string // "Rods"
  article: 'a' | 'an'
  icon: LucideIcon
  specColumns: string[] // keys into Part.specs, in display order
}
