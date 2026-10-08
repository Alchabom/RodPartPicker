import { useEffect, useState, type ReactNode } from 'react'
import { getComponentInfo } from '../api/components'
import { getPart } from '../api/mockParts'
import type { Build, ComponentType } from '../types'
import { BuildContext } from './buildContext'

const STORAGE_KEY = 'rpp:build:v1'

// Keep only entries that still resolve to a part of the right component
function loadBuild(): Build {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null) return {}
    const build: Build = {}
    for (const [component, partId] of Object.entries(raw)) {
      const info = getComponentInfo(component)
      if (info && typeof partId === 'string' && getPart(partId)?.component === info.type) {
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
