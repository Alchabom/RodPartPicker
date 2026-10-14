import { useEffect, useState, type ReactNode } from 'react'
import { getComponentInfo } from '../api/components'
import type { Build, ComponentType } from '../types'
import { BuildContext } from './buildContext'

// v2: part ids became `${component}-${dbId}` when the catalog moved to the API
const STORAGE_KEY = 'rpp:build:v2'

// Keep only well-formed entries. Ids that no longer exist in the catalog
// (which loads later, from the API) simply resolve to no part when read.
function loadBuild(): Build {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null) return {}
    const build: Build = {}
    for (const [component, partId] of Object.entries(raw)) {
      const info = getComponentInfo(component)
      if (info && typeof partId === 'string' && partId.startsWith(`${info.type}-`)) {
        build[info.type] = partId
      }
    }
    return build
  } catch {
    return {}
  }
}

export function BuildProvider({ children }: { children: ReactNode }) {
  const [build, setBuild] = useState<Build>(loadBuild)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(build))
    } catch {
      // Storage unavailable (private mode, quota) — build still works in memory
    }
  }, [build])

  const selectPart = (component: ComponentType, partId: string) =>
    setBuild((prev) => ({ ...prev, [component]: partId }))

  const removePart = (component: ComponentType) =>
    setBuild((prev) => {
      const next = { ...prev }
      delete next[component]
      return next
    })

  return (
    <BuildContext value={{ build, selectPart, removePart }}>
      {children}
    </BuildContext>
  )
}
