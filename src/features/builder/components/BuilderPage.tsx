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

export function BuilderPage() {
  const { build } = useBuild()
  const total = COMPONENTS.reduce((sum, c) => sum + (getPart(build[c.type])?.price ?? 0), 0)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-(--te-papa-green)">Your Build</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        Choose a brand for each component to browse its parts.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {COMPONENTS.map((component) => (
            <ComponentRow key={component.type} component={component} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatPrice(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </main>
  )
}
