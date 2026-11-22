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
 * step. A ?copy= or ?save= intent always gets the summary, which runs it: both
 * strip their param straight away, so the choice is made once, on arrival.
 */
export function BuilderIndex() {
  const { build, basePath } = useBuild()
  const { getPart } = useCatalog()
  const [searchParams] = useSearchParams()
  const [hadIntent] = useState(() => searchParams.has('copy') || searchParams.has('save'))
  if (!hadIntent && !getPart(build.rod)) return <Navigate to={`${basePath}/rod`} replace />
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
