// The owner's side of publishing: /api/builds/{id}/published. Each saved build
// has at most one published snapshot, and only its owner can see these routes.
import { ApiError, apiFetch } from '@/lib/api'
import type { ComponentType } from '../types'

export interface PublishedRef {
  id: number
  title: string
  writeup: string
  updatedAt: string
}

export interface PublishInput {
  title: string
  writeup: string
}

/** The build's published snapshot, or null when it isn't published. */
export async function getMyPublished(buildId: number, signal?: AbortSignal): Promise<PublishedRef | null> {
  try {
    return await apiFetch<PublishedRef>(`/builds/${buildId}/published`, { signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// Creates the snapshot (201) or refreshes it from the saved build (200)
export function publishBuild(buildId: number, input: PublishInput): Promise<PublishedRef> {
  return apiFetch<PublishedRef>(`/builds/${buildId}/published`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function unpublishBuild(buildId: number): Promise<void> {
  await apiFetch(`/builds/${buildId}/published`, { method: 'DELETE' })
}

// The public side: what Open in Builder needs from /api/published/{id}
export interface PublicBuildParts {
  title: string
  parts: Record<ComponentType, { id: number } | null>
}

// Returns the response as sent, not a trimmed copy: the catalog's detail page
// reads the same query cache entry (publishedKeys.detail) and needs the rest of it
export function getPublicBuildParts(id: number, signal?: AbortSignal): Promise<PublicBuildParts> {
  return apiFetch<PublicBuildParts>(`/published/${id}`, { signal })
}
