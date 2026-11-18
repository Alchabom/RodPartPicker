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
import { publishedKeys } from '@/lib/publishedKeys'
import { buildKeys } from '../api/builds'
import { COMPONENTS } from '../api/components'
import { getMyPublished, unpublishBuild, type PublishedRef } from '../api/publish'
import type { Build } from '../types'
import { PublishDialog } from './PublishDialog'

// Publish, update or unpublish a saved build. BuildHeader renders this in saved mode only.
export function PublishControls({ id, name, build }: { id: number; name: string; build: Build }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: published } = useQuery({
    queryKey: buildKeys.published(id),
    queryFn: ({ signal }) => getMyPublished(id, signal),
  })

  // Until the state loads (or if it fails to), show neither set of controls
  if (published === undefined) return null

  const complete = COMPONENTS.every((c) => build[c.type])

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {published === null ? (
        <>
          <Button size="sm" disabled={!complete} aria-describedby={complete ? undefined : 'publish-hint'} onClick={() => setDialogOpen(true)}>
            Publish
          </Button>
          {!complete && (
            <span id="publish-hint" className="text-muted-foreground">
              Add all five parts to publish
            </span>
          )}
        </>
      ) : (
        <>
          <Link to={`/builds/${published.id}`} className="font-semibold text-spectra hover:underline">
            Published · View
          </Link>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            Update published build
          </Button>
          <UnpublishButton buildId={id} published={published} />
        </>
      )}
      <PublishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        buildId={id}
        initial={published ?? { title: name, writeup: '' }}
        mode={published ? 'update' : 'publish'}
      />
    </div>
  )
}

function UnpublishButton({ buildId, published }: { buildId: number; published: PublishedRef }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => unpublishBuild(buildId),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: buildKeys.published(buildId) })
      queryClient.invalidateQueries({ queryKey: publishedKeys.all })
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) mutation.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          Unpublish
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Unpublish "${published.title}"?`}</AlertDialogTitle>
          <AlertDialogDescription>
            It comes off the Builds page. Your saved build stays, and you can publish it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn't unpublish, try again
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            Unpublish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
