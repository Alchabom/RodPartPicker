import { Link, useLocation } from 'react-router'
import { formatApiDate } from '@utils/formatApiDate'
import type { PublishedSummary } from '@/lib/published'
import { cn } from '@/lib/utils'
import { PartImage } from './PartImage'
import { PriceTag } from './PriceTag'
import { SpecLine } from './SpecLine'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

export type BuildCardVariant = 'default' | 'compact'

/**
 * A published build. `default` stacks the photo over the details (the Rack's
 * grid); `compact` puts the photo beside them, for a narrow column.
 */
export function BuildCard({ build, variant = 'default' }: { build: PublishedSummary; variant?: BuildCardVariant }) {
  const compact = variant === 'compact'
  const { pathname, search } = useLocation()
  const specs = build.rod
    ? [`${build.rod.brand} ${build.rod.name}`, `${build.rod.lineWeight} wt`]
    : ['Rod no longer available']
  const image = (
    <PartImage
      src={build.rod?.imageUrl ?? null}
      alt={build.rod ? `${build.rod.brand} ${build.rod.name}` : 'Rod'}
      label="Rod"
      className={cn('aspect-[2/1] w-full', compact ? 'self-start' : 'mb-2')}
    />
  )
  const details = (
    <>
      <span className={cn('line-clamp-2 break-words font-medium text-ink', compact ? 'text-[15px] leading-5' : 'text-lg')}>
        {build.title}
      </span>
      <span className="text-sm text-ink-2">
        by {build.author} · {formatApiDate(build.publishedAt, DATE_OPTIONS)}
      </span>
      <div className={compact ? 'mt-1' : 'mt-2'}>
        <SpecLine specs={specs} />
      </div>
      <PriceTag price={build.totalPrice} className="font-medium text-ink" />
      <div data-slot="votes" />
    </>
  )
  return (
    <li>
      <Link
        to={`/rack/${build.id}`}
        // The build page goes back to a Rack list it was opened from, filters and all
        state={{ from: pathname + search }}
        data-variant={variant}
        className={cn(
          'h-full rounded-card border border-hairline bg-stone-card transition-colors hover:bg-stone-raised',
          compact ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 p-3' : 'flex flex-col gap-1 p-4',
        )}
      >
        {image}
        {compact ? <div className="flex min-w-0 flex-col gap-0.5">{details}</div> : details}
      </Link>
    </li>
  )
}
