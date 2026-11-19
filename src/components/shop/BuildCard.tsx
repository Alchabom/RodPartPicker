import { Link } from 'react-router'
import { formatApiDate } from '@utils/formatApiDate'
import type { PublishedSummary } from '@/lib/published'
import { PartImage } from './PartImage'
import { PriceTag } from './PriceTag'
import { SpecLine } from './SpecLine'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

export function BuildCard({ build }: { build: PublishedSummary }) {
  const specs = build.rod
    ? [`${build.rod.brand} ${build.rod.name}`, `${build.rod.lineWeight} wt`]
    : ['Rod no longer available']
  return (
    <li>
      <Link
        to={`/builds/${build.id}`}
        className="flex h-full flex-col gap-1 rounded-card border border-hairline bg-stone-card p-4 transition-colors hover:bg-stone-raised"
      >
        <PartImage
          src={build.rod?.imageUrl ?? null}
          alt={build.rod ? `${build.rod.brand} ${build.rod.name}` : 'Rod'}
          label="Rod"
          className="mb-2 aspect-[2/1] w-full"
        />
        <span className="line-clamp-2 break-words text-lg font-medium text-ink">{build.title}</span>
        <span className="text-sm text-ink-2">
          by {build.author} · {formatApiDate(build.publishedAt, DATE_OPTIONS)}
        </span>
        <div className="mt-2">
          <SpecLine specs={specs} />
        </div>
        <PriceTag price={build.totalPrice} className="font-medium text-ink" />
        <div data-slot="votes" />
      </Link>
    </li>
  )
}
