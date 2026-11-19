import { Link } from 'react-router'
import { formatApiDate } from '@utils/formatApiDate'
import { formatPrice } from '@utils/formatPrice'
import type { PublishedSummary } from '../types'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

export function PublishedCard({ build }: { build: PublishedSummary }) {
  return (
    <li>
      <Link
        to={`/builds/${build.id}`}
        className="flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted"
      >
        <span className="text-lg font-semibold text-te-papa-green">{build.title}</span>
        <span className="text-sm text-muted-foreground">
          by {build.author} · {formatApiDate(build.publishedAt, DATE_OPTIONS)}
        </span>
        <span className="mt-2 text-sm">
          {build.rod ? `${build.rod.brand} ${build.rod.name} · ${build.rod.lineWeight}wt` : 'Rod no longer available'}
        </span>
        <span className="font-semibold tabular-nums">{formatPrice(build.totalPrice)}</span>
      </Link>
    </li>
  )
}
