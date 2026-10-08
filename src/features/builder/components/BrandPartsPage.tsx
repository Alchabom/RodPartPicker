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
import { getComponentInfo } from '../api/components'
import { getBrand, getParts } from '../api/mockParts'
import { useBuild } from '../hooks/useBuild'
import { formatPrice } from '../utils/formatPrice'

export function BrandPartsPage() {
  const params = useParams<{ component: string; brand: string }>()
  const navigate = useNavigate()
  const { build, selectPart } = useBuild()

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
      <h1 className="mt-4 mb-8 text-3xl font-bold text-(--te-papa-green)">{title}</h1>

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
          {parts.map((part) => (
            <TableRow key={part.id}>
              <TableCell className="font-medium">{part.name}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
