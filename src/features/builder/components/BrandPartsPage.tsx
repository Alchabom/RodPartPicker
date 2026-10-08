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
import page from '../styles/page.module.css'
import styles from '../styles/BrandPartsPage.module.css'

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
    <main className={page.page}>
      <Link
        to="/builder"
        className={styles.backLink}
      >
        <ArrowLeft className={styles.backIcon} aria-hidden /> Back to your build
      </Link>
      <h1 className={`${page.title} ${styles.heading}`}>{title}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {isAll && <TableHead>Brand</TableHead>}
            {component.specColumns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
            <TableHead className={page.alignRight}>Price</TableHead>
            <TableHead className={styles.actionCol} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map((part) => (
            <TableRow key={part.id}>
              <TableCell className={styles.partName}>{part.name}</TableCell>
              {isAll && <TableCell>{getBrand(part.brandId)?.name}</TableCell>}
              {component.specColumns.map((col) => (
                <TableCell key={col}>{part.specs[col]}</TableCell>
              ))}
              <TableCell className={page.price}>{formatPrice(part.price)}</TableCell>
              <TableCell className={styles.actionCol}>
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
