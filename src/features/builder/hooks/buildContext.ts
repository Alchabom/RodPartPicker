import { createContext } from 'react'
import type { Build, BuildNotes, ComponentType, RecommendedPart } from '../types'

export interface BuildContextValue {
  build: Build
  notes: BuildNotes
  selectPart: (component: ComponentType, partId: string) => void
  removePart: (component: ComponentType) => void
  clearBuild: () => void
  loadRecommendation: (parts: RecommendedPart[]) => void
}

export const BuildContext = createContext<BuildContextValue | null>(null)
