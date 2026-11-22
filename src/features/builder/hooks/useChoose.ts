import { useNavigate } from 'react-router'
import type { ComponentType } from '../types'
import { nextStep } from '../utils/steps'
import { useBuild } from './useBuild'

/** Choose on a step: put the part in the build, then go to the next empty step or the summary. */
export function useChoose(type: ComponentType): (partId: string) => void {
  const { build, basePath, selectPart } = useBuild()
  const navigate = useNavigate()
  return (partId) => {
    selectPart(type, partId)
    const next = nextStep({ ...build, [type]: partId }, type)
    navigate(next === 'summary' ? basePath : `${basePath}/${next}`)
  }
}
