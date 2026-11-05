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
}

export interface CompatibleParts {
  matches: Record<ComponentType, Set<number>>
  recommendedLines: Set<number>
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

export async function fetchCompatibleParts(rodId: number, signal?: AbortSignal): Promise<CompatibleParts> {
  const data = await apiFetch<CompatiblePartsResponse>(`/compatibility/parts?rodId=${rodId}`, { signal })
  return {
    matches: {
      rod: new Set(data.rod),
      reel: new Set(data.reel),
      line: new Set(data.line),
      leader: new Set(data.leader),
      tippet: new Set(data.tippet),
    },
    recommendedLines: new Set(data.recommendedLine),
  }
}

export async function checkBuild(ids: BuildPartIds, signal?: AbortSignal): Promise<BuildWarning[]> {
  const params = new URLSearchParams()
  for (const [name, id] of Object.entries(ids)) {
    if (id !== undefined) params.set(name, String(id))
  }
  const data = await apiFetch<{ warnings: BuildWarning[] }>(`/compatibility/check?${params}`, { signal })
  return data.warnings
}
