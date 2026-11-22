import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '@components/NotFound'
import { getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentType } from '../types'
import { PartStep } from './PartStep'
import { RigSummary } from './RigSummary'
import { RodStep } from './RodStep'

/**
 * A guided-builder step, by part. Every step but the rod waits for a rod,
 * since everything is matched to it: without one it sends you to the rod step,
 * which says why.
 */
export function StepPage({ type }: { type: ComponentType }) {
  const { build, basePath } = useBuild()
  const { getPart } = useCatalog()
  if (type === 'rod') return <RodStep />
  if (!getPart(build.rod)) return <Navigate to={`${basePath}/rod`} replace state={{ needsRod: true }} />
  return <PartStep type={type} />
}

/**
 * /builder and /builder/:buildId: the summary once there's a rod, else the rod
 * step. Decided once, on arrival: the summary itself empties the build (Save
 * this rig, Retake the questions, Start over) and must stay put while it does,
 * and a ?copy= or ?save= intent strips its param straight away but needs the
 * summary to run it.
 */
export function BuilderIndex() {
  const { build, basePath } = useBuild()
  const { getPart } = useCatalog()
  const [searchParams] = useSearchParams()
  const [startAtRod] = useState(
    () => !searchParams.has('copy') && !searchParams.has('save') && !getPart(build.rod),
  )
  if (startAtRod) return <Navigate to={`${basePath}/rod`} replace />
  return <RigSummary />
}

/** Old brand-first links (/builder/reel/lamson) land on the step, filtered to that brand. */
export function StepRedirect() {
  const { basePath } = useBuild()
  const { component, brand } = useParams<{ component: string; brand: string }>()
  const info = getComponentInfo(component)
  if (!info) return <NotFound message="We couldn't find that part of the builder." backTo={basePath} backLabel="Back to your build" />
  const search = brand && brand !== 'all' ? `?brand=${encodeURIComponent(brand)}` : ''
  return <Navigate to={`${basePath}/${info.type}${search}`} replace />
}
