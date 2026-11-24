import type { ComponentType } from '../types'
import { useBuild } from './useBuild'

/**
 * Choose on a step: put the part in the build and stay, so you can compare or
 * change your mind. The rig column's Next button moves on (see nextAction).
 */
export function useChoose(type: ComponentType): (partId: string) => void {
  const { selectPart } = useBuild()
  return (partId) => selectPart(type, partId)
}
