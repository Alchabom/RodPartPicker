import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { checkBuild, toCheckQuery, type BuildWarning } from '../api/compatibility'
import { COMPONENTS } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../utils/formatPrice'
import { ComponentRow } from './ComponentRow'

export function BuilderPage() {
  const { build } = useBuild()
  const { getPart } = useCatalog()
  const total = COMPONENTS.reduce((sum, c) => sum + (getPart(build[c.type])?.price ?? 0), 0)

  // getPart drops ids that are no longer in the catalog, so an old saved build
  // can't send an unknown id
  const ids = {
    rodId: getPart(build.rod)?.dbId,
    reelId: getPart(build.reel)?.dbId,
    flyLineId: getPart(build.line)?.dbId,
    leaderId: getPart(build.leader)?.dbId,
    tippetId: getPart(build.tippet)?.dbId,
  }
  const query = toCheckQuery(ids)
  const hasPairToCheck = Object.values(ids).filter((id) => id !== undefined).length >= 2

  // The query is stored with the response, so warnings for the previous
  // selection never show while the next request is running
  const [result, setResult] = useState<{ query: string; warnings: BuildWarning[] }>()
  const warnings = hasPairToCheck && result?.query === query ? result.warnings : []

  useEffect(() => {
    if (!hasPairToCheck) return
    const controller = new AbortController()
    checkBuild(query, controller.signal)
      .then((warnings) => setResult({ query, warnings }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // Warnings are optional, so the page keeps working without them
        console.error('Could not check the build', error)
      })
    return () => controller.abort()
  }, [query, hasPairToCheck])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-te-papa-green">Your Build</h1>
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

      {warnings.length > 0 && (
        <section
          aria-label="Compatibility warnings"
          className="mt-6 rounded-md border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4" aria-hidden /> Check your build
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            {warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
