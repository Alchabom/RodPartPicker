import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from '@/lib/utils'
import type { Brand } from '../types'

/**
 * A step's brand filter, kept in ?brand=: a list down the left column on large
 * screens, a select on small ones. Hidden when a part comes in one brand.
 */
export function BrandRail({ brands, current }: { brands: Brand[]; current: string }) {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (brands.length < 2) return null

  const to = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('brand', id)
    else next.delete('brand')
    const search = next.toString()
    return `${pathname}${search ? `?${search}` : ''}`
  }
  const options = [{ id: null, name: 'All brands' }, ...brands]

  return (
    <>
      <nav aria-label="Brands" className="hidden lg:block">
        <p className="mb-1 px-2 text-sm text-ink-2">Brand</p>
        <ul className="flex flex-col gap-0.5">
          {options.map(({ id, name }) => {
            const active = (id ?? 'all') === current
            return (
              <li key={id ?? 'all'}>
                <Link
                  to={to(id)}
                  replace
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active ? 'bg-stone-raised font-medium text-ink' : 'text-ink-2 hover:bg-stone-raised hover:text-ink',
                  )}
                >
                  {name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <label className="flex items-center gap-2 text-sm text-ink-2 lg:hidden">
        Brand
        <select
          value={current}
          onChange={(event) => navigate(to(event.target.value === 'all' ? null : event.target.value), { replace: true })}
          className="rounded-md border border-hairline bg-stone-card px-2 py-1.5 text-ink focus-visible:outline-2 focus-visible:outline-ring"
        >
          {options.map(({ id, name }) => (
            <option key={id ?? 'all'} value={id ?? 'all'}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
