import { useNavigate } from 'react-router'
import type { ComponentType } from '../types'
import { nextStep } from '../utils/steps'
import { useBuild } from './useBuild'
import { useCatalog } from './useCatalog'

/** Choose on a step: put the part in the build, then go to the next empty step or the summary. */
export function useChoose(type: ComponentType): (partId: string) => void {
  const { build, basePath, selectPart } = useBuild()
  const { getPart } = useCatalog()
  const navigate = useNavigate()
  return (partId) => {
    selectPart(type, partId)
    // A part the catalog no longer has counts as empty, as on the summary
    const live = Object.fromEntries(Object.entries(build).filter(([, id]) => getPart(id)))
    const next = nextStep({ ...live, [type]: partId }, type)
    navigate(next === 'summary' ? basePath : `${basePath}/${next}`)
  }
}
