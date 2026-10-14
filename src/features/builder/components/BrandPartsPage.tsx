import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
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
import { getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentType } from '../types'
import { fitsRod } from '../utils/compatibility'
import { formatPrice } from '../utils/formatPrice'

// Components whose rows get highlighted when they match the selected rod
const ROD_MATCHED: ReadonlySet<ComponentType> = new Set(['reel', 'line', 'leader'])

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
  const rod = ROD_MATCHED.has(component.type) ? getPart(build.rod) : undefined
  const matchCount = rod ? parts.filter((p) => fitsRod(p, rod)).length : 0

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

      {rod && (
        <p className="mb-6 rounded-md border-l-4 border-sulu bg-sulu/20 px-4 py-3 text-sm text-te-papa-green">
          <strong>{matchCount}</strong> of {parts.length} {component.plural.toLowerCase()} match your{' '}
          <strong>{rod.specs['Line Wt']} {getBrand(rod.brandId)?.name} {rod.name}</strong> rod and are highlighted below.
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
            const fits = rod !== undefined && fitsRod(part, rod)
            return (
              <TableRow key={part.id} className={cn(fits && 'bg-sulu/25 hover:bg-sulu/40')}>
                <TableCell className="font-medium">
                  {part.name}
                  {fits && (
                    <Badge className="ml-2 bg-te-papa-green text-sulu">
                      <Check data-icon="inline-start" /> Fits rod
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
