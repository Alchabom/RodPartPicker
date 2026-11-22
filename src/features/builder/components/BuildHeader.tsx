import { Button } from '@/components/ui/button'
import { useBuild } from '../hooks/useBuild'

const STATUS_TEXT = { saving: 'Saving…', saved: 'Saved', error: "Couldn't save" }

/**
 * A saved build's name and autosave status, above every step and the summary,
 * so saving stays visible while picking. Drafts have no header.
 */
export function BuildHeader() {
  const buildState = useBuild()
  if (buildState.kind !== 'saved') return null
  const nameInvalid = buildState.name.trim() === ''

  return (
    <div className="mb-8">
      {/* The name input stands in for a visible title; each page has its own h1 */}
      <input
        type="text"
        aria-label="Build name"
        aria-invalid={nameInvalid}
        maxLength={120}
        value={buildState.name}
        onChange={(event) => buildState.rename(event.target.value)}
        className="w-full rounded-md bg-transparent text-xl font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-1 flex items-center gap-2 text-sm text-ink-2">
        {/* Only the messages are announced, not the Retry button */}
        <span aria-live="polite" className="flex items-center gap-2">
          {nameInvalid && <span className="text-destructive">Give your build a name</span>}
          <span>{STATUS_TEXT[buildState.saveStatus]}</span>
        </span>
        {buildState.saveStatus === 'error' && (
          <Button variant="secondary" size="sm" onClick={buildState.retrySave}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
