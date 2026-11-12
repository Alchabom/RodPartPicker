import { createContext } from 'react'
import type { Build, ComponentType } from '../types'

export type BuildContextValue = {
  build: Build
  basePath: string // '/builder' or '/builder/42'
  selectPart: (component: ComponentType, partId: string) => void
  removePart: (component: ComponentType) => void
  clearBuild: () => void
} & (
  | { kind: 'draft' }
  | {
      kind: 'saved'
      id: number
      name: string
      rename: (name: string) => void
      saveStatus: 'saved' | 'saving' | 'error'
      retrySave: () => void
    }
)

export const BuildContext = createContext<BuildContextValue | null>(null)
