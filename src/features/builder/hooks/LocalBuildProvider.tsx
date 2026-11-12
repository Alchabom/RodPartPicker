import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
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

function storeBuild(build: Build) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(build))
  } catch {
    // Storage unavailable (private mode, quota) — build still works in memory
  }
}

export function LocalBuildProvider() {
  const [build, setBuild] = useState<Build>(loadBuild)

  useEffect(() => storeBuild(build), [build])

  const selectPart = (component: ComponentType, partId: string) =>
    setBuild((prev) => ({ ...prev, [component]: partId }))

  const removePart = (component: ComponentType) =>
    setBuild((prev) => {
      const next = { ...prev }
      delete next[component]
      return next
    })

  // Written to storage right away, not only from the effect: saving a draft
  // clears it and then navigates away, which unmounts this provider before
  // the effect for the cleared state may run
  const clearBuild = () => {
    storeBuild({})
    setBuild({})
  }

  return (
    <BuildContext
      value={{ kind: 'draft', build, basePath: '/builder', selectPart, removePart, clearBuild }}
    >
      <Outlet />
    </BuildContext>
  )
}
