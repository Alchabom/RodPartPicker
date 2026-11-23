import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compatibilityKeys, fetchCompatibleParts } from '../api/compatibility'
import { COMPONENTS, getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildQuery } from '../hooks/useBuildQuery'
import { useCatalog } from '../hooks/useCatalog'
import { useChoose } from '../hooks/useChoose'
import type { ComponentType } from '../types'
import { previousStep, stepAfter } from '../utils/steps'
import { brandFromSearch } from '../utils/brandFilter'
import { BrandChips } from './BrandChips'
import { BuildSteps } from './BuildSteps'
import { BuildHeader } from './BuildHeader'
import { PartGroups, type FitStatus } from './PartGroups'

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
  const buildState = useBuild()
  const { build, basePath, removePart } = buildState
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
  const picked = getPart(build[type])
  const previous = previousStep(type)
  const after = stepAfter(type)
  const label = component.label.toLowerCase()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <BuildHeader />
      <BuildSteps current={type} />

      <h1 className="mt-8 text-3xl font-medium text-olive">Choose {component.article} {label}</h1>
      {matchedTo.length > 0 && <p className="mt-1 text-ink-2">Matched to your {matchedTo.join(' and ')}</p>}

      {picked && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span>
            Your {label}: <span className="font-medium">{[getBrand(picked.brandId)?.name, picked.name].join(' ')}</span>
          </span>
          <Button size="sm" variant="quiet" onClick={() => removePart(type)}>
            Remove
          </Button>
        </div>
      )}

      <div className="mt-6">
        <BrandChips brands={brands} current={brand} />
      </div>

      <div className="mt-6">
        <PartGroups
          component={component}
          parts={parts}
          compatible={data}
          status={status}
          selectedId={build[type]}
          onChoose={choose}
        />
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 text-sm">
        {previous ? (
          <Link to={`${basePath}/${previous}`} className="inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> Back to {getComponentInfo(previous)!.label}
          </Link>
        ) : (
          <span />
        )}
        <Link to={after === 'summary' ? basePath : `${basePath}/${after}`} className="text-ink-2 underline-offset-4 hover:underline">
          Skip for now
        </Link>
      </div>
    </main>
  )
}
