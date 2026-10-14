import type { LucideIcon } from 'lucide-react'

export type ComponentType = 'rod' | 'reel' | 'line' | 'leader' | 'tippet'

export interface Brand {
  id: string // URL slug
  name: string
}

export interface Part {
  id: string // `${component}-${dbId}`; DB ids are only unique within a table
  dbId: number
  component: ComponentType
  brandId: string
  name: string
  price: number | null // USD; some catalog rows have no price yet
  specs: Record<string, string> // keys match the component's specColumns
  lineWeight?: number // rods and lines
  lineWeightRange?: { min: number; max: number } // reels
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

export interface Catalog {
  getBrand: (id: string | undefined) => Brand | undefined
  getPart: (id: string | undefined) => Part | undefined
  getBrandsFor: (component: ComponentType) => Brand[]
  getParts: (component: ComponentType, brandId: string | 'all') => Part[]
}
