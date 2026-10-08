import { Link } from 'react-router'
import { ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { getBrand, getPart } from '../api/mockParts'
import { useBuild } from '../hooks/useBuild'
import type { ComponentInfo } from '../types'
import { formatPrice } from '../utils/formatPrice'
import { BrandMenu } from './BrandMenu'
import page from '../styles/page.module.css'
import styles from '../styles/ComponentRow.module.css'

export function ComponentRow({ component }: { component: ComponentInfo }) {
  const { build, removePart } = useBuild()
  const part = getPart(build[component.type])
  const Icon = component.icon

  return (
    <TableRow>
      <TableCell className={styles.componentCell}>
        <Link
          to={`/builder/${component.type}/all`}
          className={styles.componentLink}
        >
          <Icon className={styles.icon} aria-hidden />
          {component.label}
        </Link>
      </TableCell>

      <TableCell>
        {part ? (
          <div className={styles.selection}>
            <div>
              <div className={styles.partName}>{part.name}</div>
              <div className={styles.partBrand}>{getBrand(part.brandId)?.name}</div>
            </div>
            <BrandMenu
              component={component}
              trigger={
                <Button size="sm" variant="outline">
                  Change <ChevronDown data-icon="inline-end" />
                </Button>
              }
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove ${component.label}`}
              onClick={() => removePart(component.type)}
            >
              <X />
            </Button>
          </div>
        ) : (
          <BrandMenu
            component={component}
            trigger={
              <Button size="sm">
                <Plus data-icon="inline-start" /> Choose {component.article} {component.label}
              </Button>
            }
          />
        )}
      </TableCell>

      <TableCell className={`${styles.priceCell} ${page.price}`}>
        {part ? formatPrice(part.price) : <span className={page.muted}>—</span>}
      </TableCell>
    </TableRow>
  )
}
