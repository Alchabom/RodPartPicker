import { useEffect, useState } from 'react'
import { RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { checkBuild, type BuildWarning } from '../api/compatibility'
import { COMPONENTS } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildQuery } from '../hooks/useBuildQuery'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../utils/formatPrice'
import { ComponentRow } from './ComponentRow'
import { QuestionnaireDialog } from './QuestionnaireDialog'

export function BuilderPage() {
  const { build, clearBuild } = useBuild()
  const { getPart } = useCatalog()
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)
  const total = COMPONENTS.reduce((sum, c) => sum + (getPart(build[c.type])?.price ?? 0), 0)

  const { query, selectedCount } = useBuildQuery()
  const hasPairToCheck = selectedCount >= 2

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-te-papa-green">Your Build</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              // The questionnaire builds a whole setup, so it starts from an empty build
              clearBuild()
              setQuestionnaireOpen(true)
            }}
          >
            <Sparkles data-icon="inline-start" /> Click here to get a setup tailored to you
          </Button>
          <Button variant="outline" onClick={clearBuild} disabled={Object.keys(build).length === 0}>
            <RotateCcw data-icon="inline-start" /> Clear build
          </Button>
        </div>
      </div>
      <QuestionnaireDialog open={questionnaireOpen} onOpenChange={setQuestionnaireOpen} />
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
        <Alert className="mt-6">
          <TriangleAlert aria-hidden />
          <AlertTitle>Check your build</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </main>
  )
}
