import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { publishedKeys } from '@/lib/publishedKeys'
import { buildKeys } from '../api/builds'
import { publishBuild, type PublishInput } from '../api/publish'
import { useBuild } from '../hooks/useBuild'
import { rackMessage } from '../utils/rackMessage'

// Same limits as the API's PublishIn. Spreading counts code points, as Python's
// len() does, so an emoji is one character.
const TITLE_MAX = 80
const WRITEUP_MAX = 4000
const charCount = (text: string) => [...text].length

const INPUT_CLASS =
  'w-full rounded-md border border-twine bg-white px-3 py-2 text-base text-te-papa-green outline-none focus:border-spectra focus:ring-2 focus:ring-spectra/30'

// FastAPI errors carry {"detail": "..."}; validation errors carry a list instead
function apiMessage(error: unknown): string {
  if (error instanceof ApiError && typeof error.detail === 'object' && error.detail !== null && 'detail' in error.detail) {
    const { detail } = error.detail
    if (typeof detail === 'string') return detail
  }
  return 'Something went wrong, try again'
}

type Props = {
  open: boolean
  onOpenChange(open: boolean): void
  buildId: number
  initial: PublishInput
  mode: 'publish' | 'update'
  /** Called after a successful publish or update, as the dialog closes */
  onSaved(mode: 'publish' | 'update'): void
}

export function PublishDialog({ open, onOpenChange, buildId, initial, mode, onSaved }: Props) {
  const [busy, setBusy] = useState(false)
  // Id of the submit allowed to close the dialog; null when none is in flight
  const activeSubmit = useRef<number | null>(null)
  const submitCount = useRef(0)

  useEffect(() => {
    if (!open) activeSubmit.current = null
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Ignore Escape, outside clicks and the close button while a submit is in flight
        if (!next && busy) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {/* Radix unmounts the content when closed, so every open starts from `initial` */}
        <PublishForm
          buildId={buildId}
          initial={initial}
          mode={mode}
          busy={busy}
          setBusy={setBusy}
          beginSubmit={() => {
            submitCount.current += 1
            activeSubmit.current = submitCount.current
            return submitCount.current
          }}
          onCancel={() => onOpenChange(false)}
          onDone={(submitId) => {
            // A stale submit must not close a dialog that was reopened
            if (activeSubmit.current !== submitId) return
            activeSubmit.current = null
            onOpenChange(false)
            onSaved(mode)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function PublishForm({
  buildId,
  initial,
  mode,
  busy,
  setBusy,
  beginSubmit,
  onCancel,
  onDone,
}: Omit<Props, 'open' | 'onOpenChange' | 'onSaved'> & {
  busy: boolean
  setBusy(busy: boolean): void
  beginSubmit(): number
  onCancel: () => void
  onDone: (submitId: number) => void
}) {
  const buildState = useBuild()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(initial.title)
  const [writeup, setWriteup] = useState(initial.writeup)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleLength = charCount(title.trim())
  const writeupLength = charCount(writeup.trim())
  const titleError = titleLength < 3 || titleLength > TITLE_MAX ? 'Use 3 to 80 characters' : null
  const writeupError = writeupLength < 1 || writeupLength > WRITEUP_MAX ? 'Write 1 to 4,000 characters' : null
  // Field messages appear after the first submit, then follow the input live
  const showTitleError = checked && titleError !== null
  const showWriteupError = checked && writeupError !== null

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setChecked(true)
    if (titleError || writeupError) return
    if (buildState.kind !== 'saved') throw new Error('PublishDialog needs a saved build')

    const submitId = beginSubmit()
    setBusy(true)
    setError(null)
    try {
      // The snapshot copies the saved build's parts, so the latest edit must land first
      try {
        await buildState.flushSave()
      } catch {
        setError("Couldn't save your latest changes; retry before posting")
        return
      }

      let response: Awaited<ReturnType<typeof publishBuild>>
      try {
        response = await publishBuild(buildId, { title: title.trim(), writeup: writeup.trim() })
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && apiMessage(e) === 'Already published') {
          // Someone else (another tab) published first: the controls switch to update
          queryClient.invalidateQueries({ queryKey: buildKeys.published(buildId) })
        }
        setError(rackMessage(apiMessage(e)))
        return
      }

      // Seed the owner's status first so the controls switch to published without a flash
      queryClient.setQueryData(buildKeys.published(buildId), response)
      queryClient.invalidateQueries({ queryKey: buildKeys.published(buildId) })
      queryClient.invalidateQueries({ queryKey: publishedKeys.all })
      queryClient.invalidateQueries({ queryKey: buildKeys.list() })
      onDone(submitId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{mode === 'publish' ? 'Post to the Community Rack' : 'Update on the Rack'}</DialogTitle>
        <DialogDescription>
          {mode === 'publish'
            ? "Anyone can see this build on the Community Rack, including people who aren't signed in. It shows your display name, these parts, the title and write-up."
            : 'The Rack copy gets your current parts, title and write-up. Later edits stay private until you update again.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <label htmlFor="publish-title" className="text-sm font-semibold text-plantation">
          Title
        </label>
        <input
          id="publish-title"
          type="text"
          maxLength={TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={showTitleError}
          aria-describedby={showTitleError ? 'publish-title-error' : undefined}
          className={INPUT_CLASS}
        />
        {showTitleError && (
          <p id="publish-title-error" className="text-sm text-destructive">
            {titleError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="publish-writeup" className="text-sm font-semibold text-plantation">
          Write-up
        </label>
        <textarea
          id="publish-writeup"
          rows={8}
          value={writeup}
          onChange={(e) => setWriteup(e.target.value)}
          aria-invalid={showWriteupError}
          aria-describedby={showWriteupError ? 'publish-writeup-count publish-writeup-error' : 'publish-writeup-count'}
          className={`${INPUT_CLASS} resize-y`}
        />
        <p id="publish-writeup-count" className="text-right text-sm tabular-nums text-muted-foreground">
          {`${charCount(writeup.trim())} / ${WRITEUP_MAX}`}
        </p>
        {showWriteupError && (
          <p id="publish-writeup-error" className="text-sm text-destructive">
            {writeupError}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (mode === 'publish' ? 'Posting…' : 'Updating…') : mode === 'publish' ? 'Post to the Rack' : 'Update on the Rack'}
        </Button>
      </DialogFooter>
    </form>
  )
}
