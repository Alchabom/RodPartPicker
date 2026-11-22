import { Link, useSearchParams } from 'react-router'
import { cn } from '@/lib/utils'
import type { Brand } from '../types'

/** A step's brand filter: All brands plus one chip per brand, kept in ?brand=. */
export function BrandChips({ brands, current }: { brands: Brand[]; current: string }) {
  const [searchParams] = useSearchParams()
  if (brands.length < 2) return null

  const to = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('brand', id)
    else next.delete('brand')
    return `?${next.toString()}`
  }
  const chip = (id: string | null, name: string) => {
    const active = (id ?? 'all') === current
    return (
      <Link
        key={id ?? 'all'}
        to={to(id)}
        replace
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          active ? 'border-olive bg-olive text-stone-card' : 'border-hairline bg-stone-card text-ink hover:bg-stone-raised',
        )}
      >
        {name}
      </Link>
    )
  }

  return (
    <nav aria-label="Brands" className="flex flex-wrap gap-2">
      {chip(null, 'All brands')}
      {brands.map((b) => chip(b.id, b.name))}
    </nav>
  )
}
