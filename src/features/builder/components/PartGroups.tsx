import { useId, useState, type CSSProperties } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatPrice } from '@utils/formatPrice'
import type { CompatibleParts } from '../api/compatibility'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentInfo, ComponentType, Part } from '../types'
import { NONE } from '../utils/format'
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

// The specs each step's rows show in columns, in the space beside the name
const ROW_SPECS: Record<ComponentType, string[]> = {
  rod: ['Length', 'Line Wt', 'Action'],
  reel: ['Line Wt', 'Water'],
  line: ['Line Wt', 'Type', 'Head (gr)'],
  leader: ['Length', 'X-Size', 'Test (lb)'],
  tippet: ['X-Size', 'Material', 'Test (lb)'],
}

// Columns with no header need their unit beside the number
const UNITS: Record<string, string> = { 'Head (gr)': 'gr', 'Test (lb)': 'lb' }

function specValue(part: Part, column: string): string | undefined {
  const value = part.specs[column]
  if (!value || value === NONE) return value
  return UNITS[column] ? `${value} ${UNITS[column]}` : value
}

// Spoken names for the columns' short labels
const SPEC_LABELS: Record<string, string> = {
  'Line Wt': 'Line weight',
  'Head (gr)': 'Head weight in grains',
  'X-Size': 'X size',
  'Test (lb)': 'Test strength in pounds',
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

  const columns = ROW_SPECS[component.type]
  const row = (part: Part) => {
    const brand = getBrand(part.brandId)?.name
    const fullName = [brand, part.name].filter(Boolean).join(' ')
    const best = component.type === 'line' && compatible?.recommendedLines.has(part.dbId)
    const selected = part.id === selectedId
    return (
      <li
        key={part.id}
        style={{ '--spec-cols': columns.length } as CSSProperties}
        className="flex items-center gap-3 border-b border-hairline py-3 last:border-b-0 sm:grid sm:grid-cols-[auto_minmax(0,1.6fr)_repeat(var(--spec-cols),minmax(0,1fr))_5.5rem_6.5rem]"
      >
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
          <p className="text-sm text-ink-2">{brand}</p>
          {/* Small screens: the specs under the name instead of in columns */}
          <p className="text-sm text-ink-2 sm:hidden">{columns.map((c) => specValue(part, c)).filter(Boolean).join(' · ')}</p>
        </div>
        {columns.map((c) => (
          <p key={c} className="hidden text-sm text-ink sm:block">
            <span className="sr-only">{SPEC_LABELS[c] ?? c}: </span>
            {specValue(part, c) ?? NONE}
          </p>
        ))}
        <span className="text-right tabular-nums">{formatPrice(part.price)}</span>
        {selected ? (
          // aria-disabled, not disabled, so keyboard focus stays here after choosing
          <Button size="sm" variant="secondary" aria-disabled="true" className="cursor-default opacity-70 sm:w-full">
            <Check data-icon="inline-start" /> Selected
          </Button>
        ) : (
          <Button size="sm" variant="secondary" aria-label={`Choose ${fullName}`} onClick={() => onChoose(part.id)} className="sm:w-full">
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
