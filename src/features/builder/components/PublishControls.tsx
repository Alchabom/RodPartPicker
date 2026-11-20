import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@components/shop'
import { ApiError } from '@/lib/api'
import { publishedKeys } from '@/lib/publishedKeys'
import { buildKeys } from '../api/builds'
import { COMPONENTS } from '../api/components'
import { getMyPublished, unpublishBuild, type PublishedRef } from '../api/publish'
import type { Build } from '../types'
import { PublishDialog } from './PublishDialog'

// Post to the Rack, update there, or take off a saved build. BuildHeader renders this in saved mode only.
export function PublishControls({ id, name, build }: { id: number; name: string; build: Build }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // What the last finished publish did; cleared when the next action starts
  const [notice, setNotice] = useState<'Posted to the Rack' | 'Updated on the Rack' | null>(null)
  const { data: published, isError, refetch } = useQuery({
    queryKey: buildKeys.published(id),
    queryFn: ({ signal }) => getMyPublished(id, signal),
  })

  const openDialog = () => {
    setNotice(null)
    setDialogOpen(true)
  }

  if (published === undefined) {
    // Still loading: show nothing rather than flash the wrong controls
    if (!isError) return null
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Couldn't load Rack status</span>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const complete = COMPONENTS.every((c) => build[c.type])

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {published === null ? (
        <>
          <Button size="sm" disabled={!complete} aria-describedby={complete ? undefined : 'publish-hint'} onClick={openDialog}>
            Post to the Rack
          </Button>
          {!complete && (
            <span id="publish-hint" className="text-muted-foreground">
              Add all five parts to post
            </span>
          )}
        </>
      ) : (
        <>
          <Link to={`/rack/${published.id}`} className="font-semibold text-belly hover:underline">
            On the Community Rack · View
          </Link>
          <ShareButton path={`/rack/${published.id}`} title={published.title} />
          <Button size="sm" variant="secondary" onClick={openDialog}>
            Update on the Rack
          </Button>
          <UnpublishButton buildId={id} published={published} onStart={() => setNotice(null)} />
        </>
      )}
      <PublishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        buildId={id}
        initial={published ?? { title: name, writeup: '' }}
        mode={published ? 'update' : 'publish'}
        onSaved={(mode) => setNotice(mode === 'publish' ? 'Posted to the Rack' : 'Updated on the Rack')}
      />
      {/* Always mounted so screen readers announce the text when it appears */}
      <span role="status" className="font-semibold text-te-papa-green">
        {notice}
      </span>
    </div>
  )
}

function UnpublishButton({
  buildId,
  published,
  onStart,
}: {
  buildId: number
  published: PublishedRef
  onStart: () => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const resync = () => {
    setOpen(false)
    queryClient.invalidateQueries({ queryKey: buildKeys.published(buildId) })
    queryClient.invalidateQueries({ queryKey: publishedKeys.all })
    queryClient.invalidateQueries({ queryKey: buildKeys.list() })
  }
  const mutation = useMutation({
    mutationFn: () => unpublishBuild(buildId),
    onSuccess: resync,
    // 404: already unpublished elsewhere, which is the outcome asked for
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) resync()
    },
  })
  const failed = mutation.isError && !(mutation.error instanceof ApiError && mutation.error.status === 404)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) mutation.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Take off the Rack
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Take "${published.title}" off the Rack?`}</AlertDialogTitle>
          <AlertDialogDescription>
            It comes off the Community Rack. Your saved build stays in My builds, and you can post it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            Couldn't take it off the Rack, try again
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault()
              onStart()
              mutation.mutate()
            }}
          >
            Take off the Rack
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
