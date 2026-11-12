import { useEffect, useRef, useState } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useParams } from 'react-router'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { NotFound } from '@components/NotFound'
import { buildKeys, getBuild, toBuild, toBuildIn, updateBuild, type BuildInput, type SavedBuild } from '../api/builds'
import type { Build, BuildNotes, ComponentType, RecommendedPart } from '../types'
import { BuildContext } from './buildContext'
import { useCatalog } from './useCatalog'
import { without } from './without'

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
  // Keyed by id: a different build gets a fresh loader, so its seed starts empty
  return <SavedBuildLoader key={buildId} id={Number(buildId)} />
}

function SavedBuildLoader({ id }: { id: number }) {
  // A save of this build may still be in flight from an editor that just
  // unmounted. Until it settles, the cache (or a GET answered before the PUT
  // commits) can hold the pre-save build, so don't fetch or seed until then.
  const saving = useIsMutating({ mutationKey: buildKeys.detail(id) }) > 0

  // The build the editor is seeded from, latched the first time the query has
  // settled with no save in flight. Once set, the editor's own autosaves
  // (which flip `saving`) never send the loader back to "Loading build…".
  const [seed, setSeed] = useState<SavedBuild | null>(null)

  // Fetch only until the editor is seeded: after that the editor's local
  // state is the source of truth, so a GET after every autosave would be
  // wasted. Once `enabled` turns true the stale query refetches, and
  // `isFetching` is true from that same render, so the seed is the post-save GET.
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: buildKeys.detail(id),
    queryFn: ({ signal }) => getBuild(id, signal),
    enabled: !seed && !saving,
  })
  if (!seed && data && !error && !saving && !isFetching) setSeed(data)

  if (seed) return <SavedBuildEditor saved={seed} />

  if (saving || isFetching || !error) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading build…</p>
  }

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

type PendingSave = { timer: ReturnType<typeof setTimeout>; input: BuildInput }

// Local state is seeded once from the loaded build and is the source of truth
// from then on. Every change autosaves after a 600 ms pause.
function SavedBuildEditor({ saved }: { saved: SavedBuild }) {
  const { getPart } = useCatalog()
  const queryClient = useQueryClient()
  const [build, setBuild] = useState<Build>(() => toBuild(saved))
  const [name, setName] = useState(saved.name)
  // Recommendation notes aren't stored by the API, so they last only while
  // this build is open. Like the draft's, a note goes when its part changes.
  const [notes, setNotes] = useState<BuildNotes>({})
  // What the server already has, as JSON
  const [lastSent, setLastSent] = useState(() => JSON.stringify(toBuildIn(toBuild(saved), saved.name, getPart)))
  // The debounced save waiting to fire, if any
  const pending = useRef<PendingSave | null>(null)
  // Set when a save finds the build deleted
  const [gone, setGone] = useState(false)

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (input: BuildInput) => updateBuild(saved.id, input),
    // The loader watches this key to wait for in-flight saves before reopening
    mutationKey: buildKeys.detail(saved.id),
    // Same scope: saves of one build run one at a time, in order
    scope: { id: `build-${saved.id}` },
    onSuccess: (_, input) => {
      queryClient.setQueryData<SavedBuild>(buildKeys.detail(saved.id), (old) => old && { ...old, ...input })
      queryClient.invalidateQueries({ queryKey: buildKeys.list() })
    },
    // A 404 means the build was deleted elsewhere: retrying can't help
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) setGone(true)
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

  // Ask before the tab closes with a save pending, in flight or failed
  useEffect(() => {
    if (gone || saveStatus === 'saved') return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [gone, saveStatus])

  const selectPart = (component: ComponentType, partId: string) => {
    setBuild((prev) => ({ ...prev, [component]: partId }))
    setNotes((prev) => without(prev, component))
  }

  const removePart = (component: ComponentType) => {
    setBuild((prev) => without(prev, component))
    setNotes((prev) => without(prev, component))
  }

  const clearBuild = () => {
    setBuild({})
    setNotes({})
  }

  const loadRecommendation = (parts: RecommendedPart[]) => {
    setBuild(Object.fromEntries(parts.map((part) => [part.component, part.partId])))
    setNotes(Object.fromEntries(parts.map((part) => [part.component, part.reason])))
  }

  // Resend the current state (after a failed save)
  const retrySave = () => {
    cancelPending()
    setLastSent(inputJson)
    mutate(input)
  }

  if (gone) return <BuildNotFound />

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
        notes,
        basePath: `/builder/${saved.id}`,
        selectPart,
        removePart,
        clearBuild,
        loadRecommendation,
      }}
    >
      <Outlet />
    </BuildContext>
  )
}
