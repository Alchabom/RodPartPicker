import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@hooks/auth'
import { Button } from '@/components/ui/button'
import { buildKeys, createBuild, toBuildIn } from '../api/builds'
import { useBuild } from '../hooks/useBuild'
import { useCatalog } from '../hooks/useCatalog'
import type { Build } from '../types'

const NEW_BUILD_NAME = 'Untitled build'
// Signed out: sign in, then come back to /builder?save=1 to finish the save
const SIGN_IN_TO_SAVE = '/login?next=%2Fbuilder%3Fsave%3D1'

function withoutSave(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  next.delete('save')
  return next
}

// Draft mode only: saves the local draft as a new build in the user's account
export function SaveDraftButton() {
  const { build, clearBuild } = useBuild()
  const { getPart } = useCatalog()
  const { status } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Survives StrictMode's effect re-run, so the save=1 intent creates one build
  const started = useRef(false)

  const isEmpty = Object.keys(build).length === 0
  const wantsSave = searchParams.get('save') === '1'

  // The one save, used by the click and by the save=1 intent
  const { mutate: save, isPending, isError } = useMutation({
    mutationFn: (draft: Build) => createBuild(toBuildIn(draft, NEW_BUILD_NAME, getPart)),
    onSuccess: (saved) => {
      clearBuild()
      queryClient.invalidateQueries({ queryKey: buildKeys.list() })
      navigate(`/builder/${saved.id}`)
    },
  })

  // Back from sign-in with ?save=1: finish the save the user asked for
  useEffect(() => {
    if (!wantsSave || status === 'loading') return
    setSearchParams(withoutSave, { replace: true })
    if (status === 'anonymous' || isEmpty || started.current) return
    started.current = true
    save(build)
  }, [wantsSave, status, isEmpty, build, save, setSearchParams])

  const onClick = () => {
    if (status === 'anonymous') navigate(SIGN_IN_TO_SAVE)
    else save(build)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={isEmpty || status === 'loading' || isPending}>
        <Save data-icon="inline-start" /> {isPending ? 'Saving…' : 'Save build'}
      </Button>
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn't save your build, try again
        </p>
      )}
    </div>
  )
}
