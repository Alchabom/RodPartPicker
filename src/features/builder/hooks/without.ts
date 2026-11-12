import type { ComponentType } from '../types'

// A copy of a per-component record with one component's entry removed
export function without<T extends object>(record: T, component: ComponentType): T {
  const next = { ...record }
  delete next[component as keyof T]
  return next
}
