import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useParams } from 'react-router'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { NotFound } from '@components/NotFound'
import { buildKeys, getBuild, toBuild, toBuildIn, updateBuild, type BuildInput, type SavedBuild } from '../api/builds'
import type { Build, ComponentType } from '../types'
import { BuildContext } from './buildContext'
import { useCatalog } from './useCatalog'

const SAVE_DELAY_MS = 600
const BUILD_ID = /^[1-9]\d*$/

// Matches the API's BuildIn: 1–120 characters once trimmed
const isValidName = (name: string) => {
  const trimmed = name.trim()
  return trimmed.length >= 1 && trimmed.length <= 120
}

function BuildNotFound() {
  return <NotFound message="Build not found" backTo="/builder/saved" backLabel="My Builds" />
}

// Route layout for /builder/:buildId/*: loads a saved build and provides it
// through BuildContext, saving every change back to the API.
export function SavedBuildProvider() {
  const { buildId = '' } = useParams()
  // Malformed ids never reach the API
  if (!BUILD_ID.test(buildId)) return <BuildNotFound />
  return <SavedBuildLoader id={Number(buildId)} />
}

function SavedBuildLoader({ id }: { id: number }) {
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: buildKeys.detail(id),
    queryFn: ({ signal }) => getBuild(id, signal),
  })

  if (!data && (!error || isFetching)) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading build…</p>
  }

  if (!data) {
    // Another user's build is a 404 too, so it looks the same as a missing one
    if (error instanceof ApiError && error.status === 404) return <BuildNotFound />
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <Button className="mt-6" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  // Keyed by id: a different build gets a fresh editor (and the old one flushes)
  return <SavedBuildEditor key={id} saved={data} />
}

type PendingSave = { timer: ReturnType<typeof setTimeout>; input: BuildInput }

// Local state is seeded once from the loaded build and is the source of truth
// from then on. Every change autosaves after a 600 ms pause.
function SavedBuildEditor({ saved }: { saved: SavedBuild }) {
  const { getPart } = useCatalog()
  const queryClient = useQueryClient()
  const [build, setBuild] = useState<Build>(() => toBuild(saved))
  const [name, setName] = useState(saved.name)
  // What the server already has, as JSON
  const [lastSent, setLastSent] = useState(() => JSON.stringify(toBuildIn(toBuild(saved), saved.name, getPart)))
  // The debounced save waiting to fire, if any
  const pending = useRef<PendingSave | null>(null)

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (input: BuildInput) => updateBuild(saved.id, input),
    // Same scope: saves of one build run one at a time, in order
    scope: { id: `build-${saved.id}` },
    onSuccess: (_, input) => {
      queryClient.setQueryData<SavedBuild>(buildKeys.detail(saved.id), (old) => old && { ...old, ...input })
      queryClient.invalidateQueries({ queryKey: buildKeys.list() })
    },
  })

  // While the name is invalid, saves keep using the last valid one
  const [lastValidName, setLastValidName] = useState(saved.name)
  const nameValid = isValidName(name)
  if (nameValid && name !== lastValidName) setLastValidName(name)

  const input = toBuildIn(build, nameValid ? name : lastValidName, getPart)
  const inputJson = JSON.stringify(input)
  // Unsent changes; true exactly while a debounced save is pending
  const dirty = inputJson !== lastSent

  const cancelPending = () => {
    if (pending.current) clearTimeout(pending.current.timer)
    pending.current = null
  }

  // Restart the debounce on every change. Comparing against lastSent means
  // StrictMode's extra run and an edit that changes nothing send nothing.
  // An invalid name is never sent: the input falls back to the last valid name.
  useEffect(() => {
    cancelPending()
    const next = JSON.parse(inputJson) as BuildInput
    if (inputJson === lastSent) return
    const timer = setTimeout(() => {
      pending.current = null
      setLastSent(inputJson)
      mutate(next)
    }, SAVE_DELAY_MS)
    pending.current = { timer, input: next }
  }, [inputJson, lastSent, mutate])

  // Leaving with a save pending: send it now. `mutate` is stable, so this
  // cleans up only on unmount. The mutation outlives this component and runs
  // this editor's mutationFn, so the save goes to this editor's saved.id.
  useEffect(
    () => () => {
      if (!pending.current) return
      clearTimeout(pending.current.timer)
      mutate(pending.current.input)
      pending.current = null
    },
    [mutate],
  )

  const saveStatus = dirty || isPending ? 'saving' : isError ? 'error' : 'saved'

  // Ask before the tab closes with a save pending or in flight
  useEffect(() => {
    if (saveStatus !== 'saving') return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveStatus])

  const selectPart = (component: ComponentType, partId: string) =>
    setBuild((prev) => ({ ...prev, [component]: partId }))

  const removePart = (component: ComponentType) =>
    setBuild((prev) => {
      const next = { ...prev }
      delete next[component]
      return next
    })

  const clearBuild = () => setBuild({})

  // Resend the current state (after a failed save)
  const retrySave = () => {
    cancelPending()
    setLastSent(inputJson)
    mutate(input)
  }

  return (
    <BuildContext
      value={{
        kind: 'saved',
        id: saved.id,
        name,
        rename: setName,
        saveStatus,
        retrySave,
        build,
        basePath: `/builder/${saved.id}`,
        selectPart,
        removePart,
        clearBuild,
      }}
    >
      <Outlet />
    </BuildContext>
  )
}
