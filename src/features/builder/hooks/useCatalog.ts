import { useContext } from 'react'
import { CatalogContext } from './catalogContext'
import type { Catalog } from '../types'

export function useCatalog(): Catalog {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a BuilderLayout')
  return ctx
}
