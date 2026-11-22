import { useSyncExternalStore } from 'react'
import { STEP_ORDER } from '../utils/steps'
import { DRAFT_CHANGE_EVENT, DRAFT_KEY } from '../utils/draftStorage'

function readPicked(): number {
  try {
    const draft: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
    if (typeof draft !== 'object' || draft === null) return 0
    const entries = draft as Record<string, unknown>
    // The same check the draft's provider loads with
    return STEP_ORDER.filter((type) => {
      const id = entries[type]
      return typeof id === 'string' && id.startsWith(`${type}-`)
    }).length
  } catch {
    // Bad JSON, or storage blocked (private mode): no count
    return 0
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DRAFT_KEY) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(DRAFT_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(DRAFT_CHANGE_EVENT, onChange)
  }
}

/**
 * How many of the five parts the local draft has, for the header's Builder
 * count on every page. Reads storage directly, since the draft's provider only
 * mounts inside the builder; doesn't check the catalog, which isn't loaded here.
 */
export function useDraftProgress(): { picked: number } {
  return { picked: useSyncExternalStore(subscribe, readPicked, () => 0) }
}
