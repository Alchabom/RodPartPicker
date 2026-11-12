import { useState } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBuild } from '../hooks/useBuild'
import { QuestionnaireDialog } from './QuestionnaireDialog'

const STATUS_TEXT = { saving: 'Saving…', saved: 'Saved', error: "Couldn't save" }

export function BuildHeader() {
  const buildState = useBuild()
  const { build, clearBuild } = buildState
  const nameInvalid = buildState.kind === 'saved' && buildState.name.trim() === ''
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {buildState.kind === 'saved' ? (
          <>
            {/* The name input stands in for the visible title */}
            <h1 className="sr-only">{buildState.name.trim() || 'Untitled build'}</h1>
            <input
              type="text"
              aria-label="Build name"
              aria-invalid={nameInvalid}
              maxLength={120}
              value={buildState.name}
              onChange={(event) => buildState.rename(event.target.value)}
              className="w-full rounded-md bg-transparent text-3xl font-bold text-te-papa-green outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {/* Only the messages are announced, not the Retry button */}
              <span aria-live="polite" className="flex items-center gap-2">
                {nameInvalid && <span className="text-destructive">Give your build a name</span>}
                <span>{STATUS_TEXT[buildState.saveStatus]}</span>
              </span>
              {buildState.saveStatus === 'error' && (
                <Button variant="outline" size="sm" onClick={buildState.retrySave}>
                  Retry
                </Button>
              )}
            </div>
          </>
        ) : (
          <h1 className="text-3xl font-bold text-te-papa-green">Your Build</h1>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
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
      <QuestionnaireDialog open={questionnaireOpen} onOpenChange={setQuestionnaireOpen} />
    </div>
  )
}
