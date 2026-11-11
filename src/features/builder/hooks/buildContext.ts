import { createContext } from 'react'
import type { Build, ComponentType } from '../types'

export interface BuildContextValue {
  build: Build
  selectPart: (component: ComponentType, partId: string) => void
  removePart: (component: ComponentType) => void
  clearBuild: () => void
}

export const BuildContext = createContext<BuildContextValue | null>(null)
