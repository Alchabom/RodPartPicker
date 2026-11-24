import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { compatibilityKeys, fetchCompatibleParts } from '../api/compatibility'
import { COMPONENTS, getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildQuery } from '../hooks/useBuildQuery'
import { useCatalog } from '../hooks/useCatalog'
import { useChoose } from '../hooks/useChoose'
import type { ComponentType } from '../types'
import { brandFromSearch } from '../utils/brandFilter'
import { PartGroups, type FitStatus } from './PartGroups'
import { StepLayout } from './StepLayout'

// What each step is checked against, named in its context line
const MATCHED_TO: Record<Exclude<ComponentType, 'rod'>, ComponentType[]> = {
  reel: ['rod'],
  line: ['rod', 'reel'],
  leader: ['rod'],
  tippet: ['leader'],
}

/** One step of the guided builder, for any part but the rod. */
export function PartStep({ type }: { type: Exclude<ComponentType, 'rod'> }) {
  const component = getComponentInfo(type)!
  const { build } = useBuild()
  const { getBrand, getBrandsFor, getPart, getParts } = useCatalog()
  const choose = useChoose(type)
  const [searchParams] = useSearchParams()
  const { query } = useBuildQuery()

  const brands = getBrandsFor(type)
  const brand = brandFromSearch(searchParams, brands)
  const parts = getParts(type, brand)

  // Fit compares this step with the rest of the rig, so it needs another part
  const comparable = COMPONENTS.some((c) => c.type !== type && getPart(build[c.type]))
  const { data, error, isPending } = useQuery({
    queryKey: compatibilityKeys.parts(query),
    queryFn: ({ signal }) => fetchCompatibleParts(query, signal),
    enabled: comparable,
  })
  useEffect(() => {
    if (error) console.error('Could not load compatible parts', error)
  }, [error])
  const status: FitStatus = !comparable ? 'off' : data ? 'ready' : error ? 'error' : isPending ? 'loading' : 'off'

  const matchedTo = MATCHED_TO[type]
    .map((t) => {
      const part = getPart(build[t])
      if (!part) return null
      const name = [getBrand(part.brandId)?.name, part.name].filter(Boolean).join(' ')
      return t === 'rod' ? `${name} · ${part.specs['Line Wt']}` : name
    })
    .filter(Boolean)

  return (
    <StepLayout
      current={type}
      title={`Choose ${component.article} ${component.label.toLowerCase()}`}
      subtitle={matchedTo.length > 0 && <p className="mt-1 text-ink-2">Matched to your {matchedTo.join(' and ')}</p>}
      brands={brands}
      brand={brand}
    >
      <PartGroups
        component={component}
        parts={parts}
        compatible={data}
        status={status}
        selectedId={build[type]}
        onChoose={choose}
      />
    </StepLayout>
  )
}
