import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildKeys, deleteBuild, listBuilds, toBuild, type SavedBuild } from '../api/builds'
import { COMPONENTS } from '../api/components'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../utils/formatPrice'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// The API's timestamps are UTC but carry no offset; without one, JS reads them as local time
const formatEdited = (updatedAt: string) =>
  dateFormat.format(new Date(/(Z|[+-]\d\d:?\d\d)$/.test(updatedAt) ? updatedAt : `${updatedAt}Z`))

function DeleteBuildButton({ id, name }: { id: number; name: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => deleteBuild(id),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: buildKeys.list() })
      queryClient.removeQueries({ queryKey: buildKeys.detail(id) })
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
        <Button variant="outline" size="sm">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete "${name}"?`}</AlertDialogTitle>
          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn't delete, try again
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MyBuildsPage() {
  const { getPart } = useCatalog()
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: buildKeys.list(),
    queryFn: ({ signal }) => listBuilds(signal),
  })

  if (!data && (!error || isFetching)) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading builds…</p>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <Button className="mt-6" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const rows = data.map((saved: SavedBuild) => {
    const build = toBuild(saved)
    const parts = COMPONENTS.map((c) => getPart(build[c.type])).filter((p) => p !== undefined)
    const total = parts.reduce((sum, p) => sum + (p.price ?? 0), 0)
    return { saved, count: parts.length, total }
  })

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-te-papa-green">My Builds</h1>
        <Button asChild>
          <Link to="/builder">New build</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No saved builds yet</p>
          <Button asChild className="mt-6">
            <Link to="/builder">Start a build</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Last edited</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ saved, count, total }) => (
              <TableRow key={saved.id}>
                <TableCell className="font-medium">
                  <Link to={`/builder/${saved.id}`} className="hover:underline">
                    {saved.name}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">{count} / {COMPONENTS.length}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(total)}</TableCell>
                <TableCell>{formatEdited(saved.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <DeleteBuildButton id={saved.id} name={saved.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
