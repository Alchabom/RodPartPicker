import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, Star } from 'lucide-react'
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
import { fetchCompatibleParts, type CompatibleParts } from '../api/compatibility'
import { COMPONENTS, getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildQuery } from '../hooks/useBuildQuery'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../utils/formatPrice'

export function BrandPartsPage() {
  const params = useParams<{ component: string; brand: string }>()
  const navigate = useNavigate()
  const { build, selectPart } = useBuild()
  const { getBrand, getPart, getParts } = useCatalog()

  const component = getComponentInfo(params.component)
  const isAll = params.brand === 'all'
  const brand = isAll ? undefined : getBrand(params.brand)
  const brandId = isAll ? 'all' : brand?.id
  const parts = component && brandId ? getParts(component.type, brandId) : []
  const { query } = useBuildQuery()

  // Highlights compare a part to the rest of the build, so they need another
  // component to be selected
  const hasOtherParts = component !== undefined
    && COMPONENTS.some((c) => c.type !== component.type && getPart(build[c.type]))

  // The query is stored with the response, so highlights for the previous
  // selection never show while the next request is running
  const [result, setResult] = useState<{ query: string; parts: CompatibleParts }>()
  const compatible = hasOtherParts && result?.query === query ? result.parts : undefined

  useEffect(() => {
    if (!hasOtherParts) return
    const controller = new AbortController()
    fetchCompatibleParts(query, controller.signal)
      .then((parts) => setResult({ query, parts }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // Highlights are optional, so the page keeps working without them
        console.error('Could not load compatible parts', error)
      })
    return () => controller.abort()
  }, [query, hasOtherParts])

  if (!component || parts.length === 0) {
    return (
      <NotFound
        message="We don't have any parts for that component and brand."
        backTo="/builder"
        backLabel="Back to your build"
      />
    )
  }

  const selectedId = build[component.type]
  const title = `${brand?.name ?? 'All'} ${component.plural}`
  const matches = compatible?.matches[component.type]
  const matchCount = matches ? parts.filter((p) => matches.has(p.dbId)).length : 0

  const handleAdd = (partId: string) => {
    selectPart(component.type, partId)
    navigate('/builder')
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link
        to="/builder"
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
          {parts.map((part) => {
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
    </main>
  )
}
