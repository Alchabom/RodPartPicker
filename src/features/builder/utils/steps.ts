import { COMPONENTS, getComponentInfo } from '../api/components'
import type { Build, ComponentType } from '../types'

/** The guided builder's steps, in rig order: the build list's order. */
export const STEP_ORDER: ComponentType[] = COMPONENTS.map((c) => c.type)

/**
 * Where Choose goes: the first empty step after `from`, then around to any
 * empty step before it (one the user skipped), or the summary when all five
 * are picked. Pass the build including the part just chosen.
 */
export function nextStep(build: Build, from: ComponentType): ComponentType | 'summary' {
  const at = STEP_ORDER.indexOf(from)
  const rest = [...STEP_ORDER.slice(at + 1), ...STEP_ORDER.slice(0, at + 1)]
  return rest.find((type) => !build[type]) ?? 'summary'
}

export interface NextAction {
  target: ComponentType | 'summary'
  label: string
}

/**
 * The step's Next button: where it goes and what it says. Null while the step
 * is empty, so Next only shows once you've picked something; then Next: line,
 * or Review rig when every step is picked. A part the catalog no longer has
 * counts as empty.
 */
export function nextAction(
  build: Build,
  from: ComponentType,
  getPart: (id: string | undefined) => unknown,
): NextAction | null {
  const live: Build = Object.fromEntries(Object.entries(build).filter(([, id]) => getPart(id)))
  if (!live[from]) return null
  const target = nextStep(live, from)
  if (target === 'summary') return { target, label: 'Review rig' }
  return { target, label: `Next: ${getComponentInfo(target)!.label.toLowerCase()}` }
}

/** Where Skip goes: the next step in order, or the summary after the tippet. */
export function stepAfter(type: ComponentType): ComponentType | 'summary' {
  return STEP_ORDER[STEP_ORDER.indexOf(type) + 1] ?? 'summary'
}

export function previousStep(type: ComponentType): ComponentType | undefined {
  const at = STEP_ORDER.indexOf(type)
  return at > 0 ? STEP_ORDER[at - 1] : undefined
}
