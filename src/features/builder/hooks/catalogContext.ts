import { createContext } from 'react'
import type { Catalog } from '../types'

export const CatalogContext = createContext<Catalog | null>(null)
