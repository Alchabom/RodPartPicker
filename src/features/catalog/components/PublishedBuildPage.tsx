import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { NotFound } from '@components/NotFound'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api'
import { publishedKeys } from '@/lib/publishedKeys'
import { formatApiDate } from '@utils/formatApiDate'
import { formatPrice } from '@utils/formatPrice'
import { getPublished } from '../api/published'
import type { Slot } from '../types'
import { PartImage } from './PartImage'

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'rod', label: 'Rod' },
  { slot: 'reel', label: 'Reel' },
  { slot: 'line', label: 'Line' },
  { slot: 'leader', label: 'Leader' },
  { slot: 'tippet', label: 'Tippet' },
]

const notFound = <NotFound message="Build not found" backTo="/builds" backLabel="Completed Builds" />

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

export function PublishedBuildPage() {
  const { id: rawId } = useParams()
  const valid = rawId !== undefined && /^[1-9]\d*$/.test(rawId)
  const id = valid ? Number(rawId) : 0
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: publishedKeys.detail(id),
    queryFn: ({ signal }) => getPublished(id, signal),
    enabled: valid,
  })

  if (!valid || (error instanceof ApiError && error.status === 404)) return notFound

  if (!data && (!error || isFetching)) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading build…</p>
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-te-papa-green">{data.title}</h1>
      <p className="mt-2 text-muted-foreground">
        by {data.author} · {formatApiDate(data.publishedAt, DATE_OPTIONS)}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(['rod', 'reel'] as const).map((slot) => {
          const part = data.parts[slot]
          const label = slot === 'rod' ? 'Rod' : 'Reel'
          return (
            <PartImage
              key={slot}
              src={part?.imageUrl ?? null}
              alt={part ? `${part.brand} ${part.name}` : label}
              label={label}
              className="aspect-[4/3] w-full"
            />
          )
        })}
      </div>

      <Table className="mt-8">
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Part</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>
              <span className="sr-only">Buy</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SLOTS.map(({ slot, label }) => {
            const part = data.parts[slot]
            return (
              <TableRow key={slot}>
                <TableCell className="font-medium">{label}</TableCell>
                {part ? (
                  <>
                    <TableCell>
                      {part.brand} {part.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(part.price)}</TableCell>
                    <TableCell>
                      {part.purchaseUrl?.startsWith('https://') && (
                        <a
                          href={part.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buy ${part.brand} ${part.name}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Buy
                        </a>
                      )}
                    </TableCell>
                  </>
                ) : (
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No longer available
                  </TableCell>
                )}
              </TableRow>
            )
          })}
          <TableRow>
            <TableCell colSpan={2} className="font-semibold">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatPrice(data.totalPrice)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>

      <p className="mt-8 whitespace-pre-line">{data.writeup}</p>

      <Button asChild className="mt-8">
        <Link to={`/builder?copy=${id}`}>Open in Builder</Link>
      </Button>
    </main>
  )
}
