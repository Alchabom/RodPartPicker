import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { publishedKeys } from '@/lib/publishedKeys'
import { getPublicBuildParts, type PublicBuildParts } from '../api/publish'
import { COMPONENTS } from '../api/components'
import { useBuild } from '../hooks/useBuild'

const POSITIVE_INT = /^[1-9]\d*$/

function withoutCopy(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  next.delete('copy')
  return next
}

// Draft mode only: /builder?copy=<id> fills the local draft from a published build
export function CopyPublishedIntent() {
  const { build, clearBuild, selectPart } = useBuild()
  const [searchParams, setSearchParams] = useSearchParams()
  // Read once: the effect below removes ?copy, and the intent must outlive that
  const [raw] = useState(() => searchParams.get('copy'))
  const [handled, setHandled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // Survives StrictMode's effect re-run, so the parts are applied once
  const applied = useRef(false)

  const valid = raw !== null && POSITIVE_INT.test(raw)
  const id = valid ? Number(raw) : null
  const isEmpty = Object.keys(build).length === 0

  // An invalid id never makes a request
  const { data, error } = useQuery({
    queryKey: publishedKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getPublicBuildParts(id!, signal),
    enabled: id !== null,
  })

  const apply = (published: PublicBuildParts) => {
    if (applied.current) return
    applied.current = true
    clearBuild()
    for (const { type } of COMPONENTS) {
      const part = published.parts[type]
      if (part) selectPart(type, `${type}-${part.id}`)
    }
    setHandled(true)
  }

  useEffect(() => {
    if (raw !== null) setSearchParams(withoutCopy, { replace: true })
  }, [raw, setSearchParams])

  // An empty draft is filled right away; otherwise the dialog below asks first
  useEffect(() => {
    if (data && isEmpty && !handled) apply(data)
  })

  if (raw === null) return null

  const gone = !valid || (error instanceof ApiError && error.status === 404)
  const failed = error !== null && !gone
  const asking = data !== undefined && !isEmpty && !handled

  return (
    <>
      {!dismissed && (gone || failed) && (
        <Alert className="mb-6 pr-10">
          <AlertDescription>
            {gone ? 'That build is no longer on the Rack' : "Couldn't load that build"}
          </AlertDescription>
          <AlertAction>
            <Button size="icon-sm" variant="quiet" aria-label="Dismiss" onClick={() => setDismissed(true)}>
              <X aria-hidden />
            </Button>
          </AlertAction>
        </Alert>
      )}
      <AlertDialog open={asking} onOpenChange={(open) => !open && setHandled(true)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Replace your current draft with ${data?.title ?? ''}?`}</AlertDialogTitle>
            <AlertDialogDescription>Your current draft will be cleared.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my draft</AlertDialogCancel>
            <AlertDialogAction onClick={() => data && apply(data)}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
