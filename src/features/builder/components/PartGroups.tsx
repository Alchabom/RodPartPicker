import { useId, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatPrice } from '@utils/formatPrice'
import type { CompatibleParts } from '../api/compatibility'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentInfo, Part } from '../types'
import { PartPhotoButton } from './PartPhotoButton'

export type FitStatus = 'off' | 'loading' | 'error' | 'ready'

interface PartGroupsProps {
  component: ComponentInfo
  parts: Part[]
  compatible: CompatibleParts | undefined
  status: FitStatus // 'off' when nothing else is picked to compare with
  selectedId: string | undefined
  onChoose: (partId: string) => void
}

const byPrice = (a: Part, b: Part) => (a.price ?? Infinity) - (b.price ?? Infinity)

/**
 * A step's parts, grouped by whether they fit the rest of the rig: Fits your
 * rig, then (lines) one weight up for a fast rod, then a collapsed Doesn't fit.
 * Where a part sits says whether it fits; there's no color code.
 */
export function PartGroups({ component, parts, compatible, status, selectedId, onChoose }: PartGroupsProps) {
  const { getBrand } = useCatalog()
  const [showMisfits, setShowMisfits] = useState(false)
  const misfitsId = useId()

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label={`Loading ${component.plural.toLowerCase()}`} className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} data-testid="part-row-skeleton" className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const row = (part: Part) => {
    const brand = getBrand(part.brandId)?.name
    const fullName = [brand, part.name].filter(Boolean).join(' ')
    const specs = [brand, ...component.specColumns.slice(0, 2).map((c) => part.specs[c])].filter(Boolean).join(' · ')
    const best = component.type === 'line' && compatible?.recommendedLines.has(part.dbId)
    return (
      <li key={part.id} className="flex items-center gap-4 border-b border-hairline py-3 last:border-b-0">
        <PartPhotoButton src={part.imageUrl} name={fullName} label={component.label} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {part.name}
            {best && (
              <Badge variant="recommended" className="ml-2 align-middle">
                Best match
              </Badge>
            )}
          </p>
          <p className="text-sm text-ink-2">{specs}</p>
        </div>
        <span className="w-20 text-right tabular-nums">{formatPrice(part.price)}</span>
        {part.id === selectedId ? (
          <Button size="sm" variant="secondary" disabled>
            <Check data-icon="inline-start" /> Selected
          </Button>
        ) : (
          <Button size="sm" variant="secondary" aria-label={`Choose ${fullName}`} onClick={() => onChoose(part.id)}>
            Choose
          </Button>
        )}
      </li>
    )
  }
  const list = (rows: Part[]) => <ul>{rows.map(row)}</ul>

  if (parts.length === 0) {
    return <p className="text-ink-2">We don't have any {component.plural.toLowerCase()} yet.</p>
  }

  if (status !== 'ready' || !compatible) {
    return (
      <>
        {status === 'error' && <p className="mb-3 text-sm text-ink-2">Couldn't check what fits</p>}
        {list(parts)}
      </>
    )
  }

  const notCompatible = compatible.notCompatible[component.type]
  const heavier = component.type === 'line' ? compatible.heavierLines : new Set<number>()
  const misfits = parts.filter((p) => notCompatible.has(p.dbId))
  const heavierParts = parts.filter((p) => heavier.has(p.dbId)).sort(byPrice)
  // Anything the API neither matched nor ruled out stays with the fits, as before
  const fits = parts.filter((p) => !notCompatible.has(p.dbId) && !heavier.has(p.dbId))

  const heading = (text: string, count: number) => (
    <h2 className="mb-1 text-lg font-medium text-olive">
      {text} <span className="font-normal text-ink-3">({count})</span>
    </h2>
  )

  return (
    <div className="flex flex-col gap-8">
      {fits.length > 0 && (
        <section>
          {heading('Fits your rig', fits.length)}
          {list(fits)}
        </section>
      )}
      {heavierParts.length > 0 && (
        <section>
          {heading('One weight up, for your fast rod', heavierParts.length)}
          {list(heavierParts)}
        </section>
      )}
      {misfits.length > 0 && (
        <section>
          {/* A heading like the other groups, so heading navigation finds it */}
          <h2 className="text-lg font-medium">
            <Button
              variant="quiet"
              aria-expanded={showMisfits}
              aria-controls={misfitsId}
              onClick={() => setShowMisfits((open) => !open)}
              className="-ml-3 text-base"
            >
              Doesn't fit your rig ({misfits.length})
              <ChevronDown data-icon="inline-end" className={cn('transition-transform', showMisfits && 'rotate-180')} />
            </Button>
          </h2>
          <div id={misfitsId}>{showMisfits && list(misfits)}</div>
        </section>
      )}
    </div>
  )
}
