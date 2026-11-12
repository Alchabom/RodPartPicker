import { useEffect, useState, type ReactNode } from 'react'
import { getComponentInfo } from '../api/components'
import type { Build, BuildNotes, ComponentType, RecommendedPart } from '../types'
import { BuildContext } from './buildContext'

// v2: part ids became `${component}-${dbId}` when the catalog moved to the API
const STORAGE_KEY = 'rpp:build:v2'
// Kept apart from the build, so builds saved before notes existed still load
const NOTES_KEY = 'rpp:notes:v1'

function readStorage(key: string): object {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return typeof raw === 'object' && raw !== null ? raw : {}
  } catch {
    return {}
  }
}

function writeStorage(key: string, value: object) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode, quota) — build still works in memory
  }
}

// Keep only well-formed entries. Ids that no longer exist in the catalog
// (which loads later, from the API) simply resolve to no part when read.
function loadBuild(): Build {
  const build: Build = {}
  for (const [component, partId] of Object.entries(readStorage(STORAGE_KEY))) {
    const info = getComponentInfo(component)
    if (info && typeof partId === 'string' && partId.startsWith(`${info.type}-`)) {
      build[info.type] = partId
    }
  }
  return build
}

function loadNotes(): BuildNotes {
  const notes: BuildNotes = {}
  for (const [component, note] of Object.entries(readStorage(NOTES_KEY))) {
    const info = getComponentInfo(component)
    if (info && typeof note === 'string') notes[info.type] = note
  }
  return notes
}

function without<T extends object>(record: T, component: ComponentType): T {
  const next = { ...record }
  delete next[component as keyof T]
  return next
}

export function BuildProvider({ children }: { children: ReactNode }) {
  const [build, setBuild] = useState<Build>(loadBuild)
  // A note explains why its part was recommended, so it goes when the part changes
  const [notes, setNotes] = useState<BuildNotes>(loadNotes)

  useEffect(() => writeStorage(STORAGE_KEY, build), [build])
  useEffect(() => writeStorage(NOTES_KEY, notes), [notes])

  const selectPart = (component: ComponentType, partId: string) => {
    setBuild((prev) => ({ ...prev, [component]: partId }))
    setNotes((prev) => without(prev, component))
  }

  const removePart = (component: ComponentType) => {
    setBuild((prev) => without(prev, component))
    setNotes((prev) => without(prev, component))
  }

  const clearBuild = () => {
    setBuild({})
    setNotes({})
  }

  const loadRecommendation = (parts: RecommendedPart[]) => {
    setBuild(Object.fromEntries(parts.map((part) => [part.component, part.partId])))
    setNotes(Object.fromEntries(parts.map((part) => [part.component, part.reason])))
  }

  return (
    <BuildContext value={{ build, notes, selectPart, removePart, clearBuild, loadRecommendation }}>
      {children}
    </BuildContext>
  )
}
