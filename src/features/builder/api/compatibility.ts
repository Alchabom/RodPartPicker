// Compatibility decisions come from the API (GET /api/compatibility/*), so the
// rules live in one place: api/app/compatibility/rules.py.
import { apiFetch } from '@/lib/api'
import type { ComponentType } from '../types'

interface CompatiblePartsResponse {
  rod: number[]
  reel: number[]
  line: number[]
  leader: number[]
  tippet: number[]
  recommendedLine: number[]
  heavierLine: number[]
  notCompatible: Record<ComponentType, number[]>
}

export interface CompatibleParts {
  matches: Record<ComponentType, Set<number>>
  recommendedLines: Set<number>
  heavierLines: Set<number> // one weight up, for fast rods
  notCompatible: Record<ComponentType, Set<number>> // empty until another part is picked
}

export interface BuildPartIds {
  rodId?: number
  reelId?: number
  flyLineId?: number
  leaderId?: number
  tippetId?: number
}

export interface BuildWarning {
  code: string
  message: string
}

export const compatibilityKeys = {
  check: (query: string) => ['compatibility', 'check', query] as const,
  parts: (query: string) => ['compatibility', 'parts', query] as const,
}

export async function fetchCompatibleParts(query: string, signal?: AbortSignal): Promise<CompatibleParts> {
  const data = await apiFetch<CompatiblePartsResponse>(`/compatibility/parts?${query}`, { signal })
  return {
    matches: {
      rod: new Set(data.rod),
      reel: new Set(data.reel),
      line: new Set(data.line),
      leader: new Set(data.leader),
      tippet: new Set(data.tippet),
    },
    recommendedLines: new Set(data.recommendedLine),
    heavierLines: new Set(data.heavierLine),
    notCompatible: {
      rod: new Set(data.notCompatible.rod),
      reel: new Set(data.notCompatible.reel),
      line: new Set(data.notCompatible.line),
      leader: new Set(data.notCompatible.leader),
      tippet: new Set(data.notCompatible.tippet),
    },
  }
}

// A plain string, so components can compare builds and use it as an effect dependency
export function toBuildQuery(ids: BuildPartIds): string {
  const params = new URLSearchParams()
  for (const [name, id] of Object.entries(ids)) {
    if (id !== undefined) params.set(name, String(id))
  }
  return params.toString()
}

export async function checkBuild(query: string, signal?: AbortSignal): Promise<BuildWarning[]> {
  const data = await apiFetch<{ warnings: BuildWarning[] }>(`/compatibility/check?${query}`, { signal })
  return data.warnings
}
