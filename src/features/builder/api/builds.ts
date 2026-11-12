// Saved builds live in the API (/api/builds). All routes require sign-in.
import { apiFetch } from '@/lib/api'
import type { Build, Catalog, ComponentType } from '../types'

export interface SavedBuild {
  id: number
  name: string
  rodId: number | null
  reelId: number | null
  flyLineId: number | null
  leaderId: number | null
  tippetId: number | null
  createdAt: string
  updatedAt: string
}

export type BuildInput = Pick<SavedBuild, 'name' | 'rodId' | 'reelId' | 'flyLineId' | 'leaderId' | 'tippetId'>

export const buildKeys = {
  all: ['builds'] as const,
  list: () => ['builds', 'list'] as const,
  detail: (id: number) => ['builds', id] as const,
}

const ID_FIELDS: Record<ComponentType, keyof BuildInput> = {
  rod: 'rodId',
  reel: 'reelId',
  line: 'flyLineId',
  leader: 'leaderId',
  tippet: 'tippetId',
}

const COMPONENT_TYPES = Object.keys(ID_FIELDS) as ComponentType[]

export function listBuilds(signal?: AbortSignal): Promise<SavedBuild[]> {
  return apiFetch<SavedBuild[]>('/builds', { signal })
}

export function getBuild(id: number, signal?: AbortSignal): Promise<SavedBuild> {
  return apiFetch<SavedBuild>(`/builds/${id}`, { signal })
}

export function createBuild(input: BuildInput): Promise<SavedBuild> {
  return apiFetch<SavedBuild>('/builds', { method: 'POST', body: JSON.stringify(input) })
}

// PUT replaces the whole build, so the input always carries all five part ids
export async function updateBuild(id: number, input: BuildInput): Promise<void> {
  await apiFetch(`/builds/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function deleteBuild(id: number): Promise<void> {
  await apiFetch(`/builds/${id}`, { method: 'DELETE' })
}

export function toBuild(saved: SavedBuild): Build {
  const build: Build = {}
  for (const component of COMPONENT_TYPES) {
    const id = saved[ID_FIELDS[component]]
    if (id !== null) build[component] = `${component}-${id}`
  }
  return build
}

export function toBuildIn(build: Build, name: string, getPart: Catalog['getPart']): BuildInput {
  const input: BuildInput = {
    name: name.trim(),
    rodId: null,
    reelId: null,
    flyLineId: null,
    leaderId: null,
    tippetId: null,
  }
  for (const component of COMPONENT_TYPES) {
    const field = ID_FIELDS[component]
    // Narrow to the id fields: `name` is the only non-id key of BuildInput
    if (field !== 'name') input[field] = getPart(build[component])?.dbId ?? null
  }
  return input
}
