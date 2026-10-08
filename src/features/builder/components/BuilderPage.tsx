import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { COMPONENTS } from '../api/components'
import { getPart } from '../api/mockParts'
import { useBuild } from '../hooks/useBuild'
import { formatPrice } from '../utils/formatPrice'
import { ComponentRow } from './ComponentRow'
import page from '../styles/page.module.css'
import styles from '../styles/BuilderPage.module.css'

export function BuilderPage() {
  const { build } = useBuild()
  const total = COMPONENTS.reduce((sum, c) => sum + (getPart(build[c.type])?.price ?? 0), 0)

  return (
    <main className={page.page}>
      <h1 className={page.title}>Your Build</h1>
      <p className={styles.subtitle}>
        Choose a brand for each component to browse its parts.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead className={page.alignRight}>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {COMPONENTS.map((component) => (
            <ComponentRow key={component.type} component={component} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className={styles.totalLabel}>Total</TableCell>
            <TableCell className={styles.totalValue}>{formatPrice(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </main>
  )
}
