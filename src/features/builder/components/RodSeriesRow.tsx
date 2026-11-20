import { useId } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PartImage } from '@components/shop'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatPrice } from '@utils/formatPrice'
import { formatSeriesSummary, type RodSeries } from '../api/rodSeries'
import { WATER_LABELS, capitalize, formatLength } from '../utils/format'

interface RodSeriesRowProps {
  series: RodSeries
  open: boolean
  onToggle: () => void
  selectedPartId: string | undefined
  onAdd: (partId: string) => void
}

/** One rod series: a photo and summary that opens to a big photo and its sizes. */
export function RodSeriesRow({ series, open, onToggle, selectedPartId, onAdd }: RodSeriesRowProps) {
  const sizesId = useId()
  const label = `${series.brand.name} ${series.name}`
  const buyUrl = series.purchaseUrl?.startsWith('https://') ? series.purchaseUrl : null

  return (
    <section className={cn('rounded-lg border border-hairline bg-card', open && 'border-ink/20')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={sizesId}
        onClick={onToggle}
        className="flex w-full flex-col gap-3 rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-4"
      >
        {/* Decorative here: the series name sits beside it */}
        <span aria-hidden className="w-full shrink-0 sm:w-42">
          <PartImage src={series.imageUrl} alt="" label="Rod" className="aspect-[7/4] w-full sm:h-24" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-foreground">{series.name}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{formatSeriesSummary(series.summary)}</span>
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {open ? 'Hide sizes' : 'Show sizes'}
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div id={sizesId} className="grid gap-5 px-4 pt-1 pb-4 lg:grid-cols-[360px_1fr]">
          <div>
            <PartImage
              src={series.imageUrl}
              alt={label}
              label="Rod"
              className="aspect-[4/3] w-full lg:w-90"
            />
            {buyUrl && (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buy ${label}`}
                className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Buy from the manufacturer
              </a>
            )}
          </div>
          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Line wt</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Pieces</TableHead>
                  <TableHead>Water</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.sizes.map((size) => {
                  const partId = `rod-${size.id}`
                  const selected = partId === selectedPartId
                  return (
                    <TableRow key={size.id} className={cn(selected && 'bg-primary/5')}>
                      <TableCell className="font-medium">{size.sizeCode}</TableCell>
                      <TableCell>{formatLength(size.lengthIn)}</TableCell>
                      <TableCell>{size.lineWeight} wt</TableCell>
                      <TableCell>{capitalize(size.action?.replace('_', '-') ?? null)}</TableCell>
                      <TableCell>{size.pieces ?? '—'}</TableCell>
                      <TableCell>{WATER_LABELS[size.water]}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPrice(size.price)}</TableCell>
                      <TableCell className="text-right">
                        {selected ? (
                          <Button size="sm" variant="secondary" disabled>
                            <Check data-icon="inline-start" /> Selected
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            aria-label={`Add ${label} ${size.sizeCode ?? `${formatLength(size.lengthIn)} ${size.lineWeight} wt`}`}
                            onClick={() => onAdd(partId)}
                          >
                            Add
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  )
}
