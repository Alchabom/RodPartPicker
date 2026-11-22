import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FlyHook, PartImage } from '@components/shop'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@utils/formatPrice'
import { COMPONENTS, getComponentInfo } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildCheck } from '../hooks/useBuildCheck'
import { useCatalog } from '../hooks/useCatalog'
import { nextStep } from '../utils/steps'
import { BuildHeader } from './BuildHeader'
import { BuildSteps } from './BuildSteps'
import { CopyPublishedIntent } from './CopyPublishedIntent'
import { PublishControls } from './PublishControls'
import { QuestionnaireDialog } from './QuestionnaireDialog'
import { SaveDraftButton } from './SaveDraftButton'

/**
 * The end of the guided builder: the rig's five parts down a fly line, with
 * Change on each. "Your rig is ready" once all five fit; "Almost there" when a
 * part no longer fits, with the reason beside it and a way to fix it.
 */
export function RigSummary() {
  const buildState = useBuild()
  const { build, notes, basePath, clearBuild } = buildState
  const { getBrand, getPart } = useCatalog()
  const { flags, failed } = useBuildCheck()
  const navigate = useNavigate()
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)

  const parts = COMPONENTS.map((component) => ({ component, part: getPart(build[component.type]) }))
  const pickedCount = parts.filter((p) => p.part).length
  // Parts the catalog no longer has count as empty, for picking and for Continue
  const livePicks = Object.fromEntries(parts.filter((p) => p.part).map((p) => [p.component.type, p.part!.id]))
  const hasFlags = Object.keys(flags.byPart).length > 0 || flags.buildWide.length > 0
  const complete = pickedCount === COMPONENTS.length && !hasFlags
  const next = nextStep(livePicks, 'tippet')
  const nextInfo = next === 'summary' ? undefined : getComponentInfo(next)
  const total = parts.reduce((sum, { part }) => sum + (part?.price ?? 0), 0)
  const rod = parts[0].part

  const heading = complete ? 'Your rig is ready' : hasFlags ? 'Almost there' : `${pickedCount} of 5 picked`
  const messages = [...COMPONENTS.flatMap((c) => flags.byPart[c.type] ?? []), ...flags.buildWide]

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {buildState.kind === 'draft' && <CopyPublishedIntent />}
      <BuildHeader />
      <BuildSteps current="summary" />

      <h1 className="mt-8 text-3xl font-medium text-olive">{heading}</h1>
      {complete && rod && (
        <p className="mt-1 text-ink-2">
          Five parts, matched to your {rod.specs['Line Wt']} {[getBrand(rod.brandId)?.name, rod.name].filter(Boolean).join(' ')}.
        </p>
      )}
      {failed && <p className="mt-1 text-sm text-ink-2">Couldn't check the rig</p>}

      {messages.length > 0 && (
        <div role="alert" className="mt-4 rounded-md border border-hairline border-l-4 border-l-negative bg-stone-card px-4 py-3">
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The rig down its line, as on the home page: a guide ring per part */}
      <ol aria-label="Your rig" className="relative mt-8 mb-16">
        {parts.map(({ component, part }, i) => {
          const label = component.label.toLowerCase()
          const flagged = flags.byPart[component.type]
          const step = `${basePath}/${component.type}`
          return (
            <li key={component.type} className="relative pb-6 pl-10 last:pb-0">
              {i < parts.length - 1 ? (
                <span aria-hidden="true" className="absolute top-3 -bottom-3 left-2 w-[3px] -translate-x-1/2 bg-belly" />
              ) : (
                // Past the tippet the line thins to a tippet and ends in a hook
                <>
                  <span aria-hidden="true" className="absolute top-3 -bottom-5 left-2 w-[1.5px] -translate-x-1/2 bg-belly" />
                  <span data-testid="rig-hook" className="absolute top-[calc(100%+15px)] left-[3px]">
                    <FlyHook />
                  </span>
                </>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1.5 left-0.5 size-3 rounded-full border-[1.5px] bg-stone-page',
                  flagged ? 'border-2 border-negative' : part ? 'border-dorsal-band' : 'border-dashed border-ink-3',
                )}
              />
              {part ? (
                <div className="flex gap-4">
                  <PartImage src={part.imageUrl} alt="" label={component.label} className="h-14 w-24 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-3">{component.label}</p>
                    <p className="font-medium text-ink">{[getBrand(part.brandId)?.name, part.name].join(' ')}</p>
                    <p className="text-sm text-ink-2">
                      {notes[component.type] ?? component.specColumns.slice(0, 2).map((c) => part.specs[c]).filter(Boolean).join(' · ')}
                    </p>
                    {flagged?.map((message) => (
                      <p key={message} className="mt-1 text-sm text-negative">
                        {message}
                      </p>
                    ))}
                    {flagged && (
                      <Link to={step} className="mt-1 inline-block text-sm font-medium text-ink underline underline-offset-4">
                        Find {component.article} {label} that fits
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                    {part.purchaseUrl?.startsWith('https://') ? (
                      <a
                        href={part.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Buy ${[getBrand(part.brandId)?.name, part.name].join(' ')}, ${formatPrice(part.price)}`}
                        className="tabular-nums underline-offset-4 hover:underline"
                      >
                        {formatPrice(part.price)}
                      </a>
                    ) : (
                      <span className="tabular-nums">{formatPrice(part.price)}</span>
                    )}
                    <Link to={step} aria-label={`Change ${label}`} className="text-ink-2 underline underline-offset-4">
                      Change
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-ink-2">{component.label}</p>
                  <Link to={step} className="text-sm font-medium text-ink underline underline-offset-4">
                    Choose {component.article} {label}
                  </Link>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex justify-between border-t border-hairline pt-4 font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-4">
        {nextInfo && (
          <Button asChild size="lg">
            <Link to={`${basePath}/${nextInfo.type}`}>
              Continue: choose {nextInfo.article} {nextInfo.label.toLowerCase()}
            </Link>
          </Button>
        )}
        {buildState.kind === 'draft' ? (
          <SaveDraftButton variant={nextInfo ? 'secondary' : 'primary'} />
        ) : (
          <PublishControls id={buildState.id} name={buildState.name} build={build} />
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Button
          variant="link"
          onClick={() => {
            clearBuild()
            navigate(`${basePath}/rod`)
          }}
        >
          Start over
        </Button>
        <Button
          variant="link"
          onClick={() => {
            clearBuild()
            setQuestionnaireOpen(true)
          }}
        >
          Retake the questions
        </Button>
      </div>

      <QuestionnaireDialog open={questionnaireOpen} onOpenChange={setQuestionnaireOpen} />
    </main>
  )
}
