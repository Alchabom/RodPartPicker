import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, ChevronDown, Star } from 'lucide-react'
import { NotFound } from '@components/NotFound'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { compatibilityKeys, fetchCompatibleParts } from '../api/compatibility'
import { COMPONENTS, getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildQuery } from '../hooks/useBuildQuery'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../utils/formatPrice'

export function BrandPartsPage() {
  const params = useParams<{ component: string; brand: string }>()
  const navigate = useNavigate()
  const { build, basePath, selectPart } = useBuild()
  const { getBrand, getPart, getParts } = useCatalog()

  const component = getComponentInfo(params.component)
  const isAll = params.brand === 'all'
  const brand = isAll ? undefined : getBrand(params.brand)
  const brandId = isAll ? 'all' : brand?.id
  const parts = component && brandId ? getParts(component.type, brandId) : []
  const { query } = useBuildQuery()

  // Highlights compare a part to the rest of the build, so they need another
  // component to be selected. The rod starts the build, so rods are never
  // filtered: every rod stays plain and available
  const showsCompatibility = component !== undefined
    && component.type !== 'rod'
    && COMPONENTS.some((c) => c.type !== component.type && getPart(build[c.type]))

  const [showUnmatched, setShowUnmatched] = useState(false)

  // No placeholderData: highlights for the previous selection never show
  // while the next request is running
  const { data, error } = useQuery({
    queryKey: compatibilityKeys.parts(query),
    queryFn: ({ signal }) => fetchCompatibleParts(query, signal),
    enabled: showsCompatibility,
  })
  const compatible = showsCompatibility ? data : undefined

  useEffect(() => {
    // Highlights are optional, so the page keeps working without them
    if (error) console.error('Could not load compatible parts', error)
  }, [error])

  if (!component || parts.length === 0) {
    return (
      <NotFound
        message="We don't have any parts for that component and brand."
        backTo={basePath}
        backLabel="Back to your build"
      />
    )
  }

  const selectedId = build[component.type]
  const title = `${brand?.name ?? 'All'} ${component.plural}`
  const matches = compatible?.matches[component.type]
  const matchCount = matches ? parts.filter((p) => matches.has(p.dbId)).length : 0

  // Parts that don't fit the build move into a collapsed list below the rest
  const notCompatible = compatible?.notCompatible[component.type]
  const unmatched = notCompatible ? parts.filter((p) => notCompatible.has(p.dbId)) : []

  // Lines one weight up that suit a fast rod, cheapest first (unpriced last)
  const heavierLines = component.type === 'line' ? compatible?.heavierLines : undefined
  const heavier = heavierLines
    ? parts
        .filter((p) => heavierLines.has(p.dbId))
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    : []

  // Each part shows in one place: its own section, or the main table
  const listed = parts.filter((p) => !notCompatible?.has(p.dbId) && !heavierLines?.has(p.dbId))

  const renderTable = (rows: typeof parts) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {isAll && <TableHead>Brand</TableHead>}
          {component.specColumns.map((col) => (
            <TableHead key={col}>{col}</TableHead>
          ))}
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((part) => {
          const fits = matches?.has(part.dbId) ?? false
          const recommended = component.type === 'line' && compatible?.recommendedLines.has(part.dbId)
          return (
            <TableRow key={part.id} className={cn(fits && 'bg-sulu/25 hover:bg-sulu/40')}>
              <TableCell className="font-medium">
                {part.name}
                {fits && (
                  <Badge className="ml-2 bg-te-papa-green text-sulu">
                    <Check data-icon="inline-start" /> Fits build
                  </Badge>
                )}
                {recommended && (
                  <Badge className="ml-2 bg-sulu text-te-papa-green">
                    <Star data-icon="inline-start" /> Recommended
                  </Badge>
                )}
              </TableCell>
              {isAll && <TableCell>{getBrand(part.brandId)?.name}</TableCell>}
              {component.specColumns.map((col) => (
                <TableCell key={col}>{part.specs[col]}</TableCell>
              ))}
              <TableCell className="text-right tabular-nums">{formatPrice(part.price)}</TableCell>
              <TableCell className="text-right">
                {part.id === selectedId ? (
                  <Button size="sm" variant="secondary" disabled>
                    <Check data-icon="inline-start" /> Selected
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleAdd(part.id)}>
                    Add
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  const handleAdd = (partId: string) => {
    selectPart(component.type, partId)
    navigate(basePath)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link
        to={basePath}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to your build
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-te-papa-green">{title}</h1>

      {matches && (
        <p className="mb-6 rounded-md border-l-4 border-sulu bg-sulu/20 px-4 py-3 text-sm text-te-papa-green">
          <strong>{matchCount}</strong> of {parts.length} {component.plural.toLowerCase()} match your build and are highlighted below.
        </p>
      )}

      {listed.length > 0 && renderTable(listed)}

      {heavier.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-te-papa-green">
            Consider a slightly heavier line, for your fast action rod
          </h2>
          {renderTable(heavier)}
        </section>
      )}

      {unmatched.length > 0 && (
        <section className="mt-8">
          <Button
            variant="outline"
            aria-expanded={showUnmatched}
            onClick={() => setShowUnmatched((open) => !open)}
          >
            Not recommended, but up to you ({unmatched.length})
            <ChevronDown
              data-icon="inline-end"
              className={cn('transition-transform', showUnmatched && 'rotate-180')}
            />
          </Button>
          {showUnmatched && <div className="mt-4">{renderTable(unmatched)}</div>}
        </section>
      )}
    </main>
  )
}
