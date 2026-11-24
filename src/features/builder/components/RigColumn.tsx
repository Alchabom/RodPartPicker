import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@utils/formatPrice'
import { COMPONENTS } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildCheck } from '../hooks/useBuildCheck'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentType } from '../types'
import { nextAction } from '../utils/steps'

/**
 * The left column on every step: your rig in rig order (each part links to its
 * step and can be removed), Next, and Review rig with the total. On small
 * screens it folds into a row of step links and a Next bar along the bottom.
 * Every step but the rod waits for a rod, since everything is matched to it.
 */
export function RigColumn({ current }: { current: ComponentType }) {
  const { build, basePath, removePart } = useBuild()
  const { getPart, getBrand } = useCatalog()
  const { flags } = useBuildCheck()
  const navigate = useNavigate()
  const links = useRef<Partial<Record<ComponentType, HTMLAnchorElement | null>>>({})

  const hasRod = getPart(build.rod) !== undefined
  const fullName = (type: ComponentType) => {
    const part = getPart(build[type])
    return part ? [getBrand(part.brandId)?.name, part.name].filter(Boolean).join(' ') : undefined
  }
  const total = COMPONENTS.reduce((sum, { type }) => sum + (getPart(build[type])?.price ?? 0), 0)
  const next = nextAction(build, current, getPart)
  const goNext = () => navigate(next.target === 'summary' ? basePath : `${basePath}/${next.target}`)

  // Announce a pick on this step, but not what was already there on arrival
  const [announcement, setAnnouncement] = useState('')
  const picked = build[current]
  const seen = useRef(picked)
  const currentLabel = COMPONENTS.find((c) => c.type === current)!.label
  const pickedName = fullName(current)
  useEffect(() => {
    if (seen.current === picked) return
    seen.current = picked
    setAnnouncement(pickedName ? `${currentLabel}: ${pickedName}` : `${currentLabel} removed`)
  }, [picked, pickedName, currentLabel])

  const remove = (type: ComponentType) => {
    removePart(type)
    links.current[type]?.focus()
  }

  return (
    <>
      <div className="hidden lg:block">
        <nav aria-label="Your rig" className="rounded-lg border border-hairline bg-stone-card p-2">
          <p className="mb-1 px-2 text-sm text-ink-2">Your rig</p>
          <ol className="flex flex-col">
            {COMPONENTS.map(({ type, label }) => {
              const name = fullName(type)
              const flagged = Boolean(flags.byPart[type])
              const open = type === 'rod' || hasRod
              const body = (
                <>
                  <span className={cn('text-xs', type === current ? 'font-medium text-ink' : 'text-ink-2')}>{label}</span>
                  <span className={cn('block truncate text-sm', name ? 'text-ink' : 'text-ink-3')}>
                    {name ?? '—'}
                    {flagged && <span className="ml-1 text-negative">(doesn't fit)</span>}
                  </span>
                </>
              )
              return (
                <li key={type} className="flex items-center gap-1">
                  {open ? (
                    <Link
                      ref={(el) => {
                        links.current[type] = el
                      }}
                      to={`${basePath}/${type}`}
                      aria-current={type === current ? 'step' : undefined}
                      className={cn(
                        'min-w-0 flex-1 rounded-md border-l-2 px-2 py-1.5 hover:bg-stone-raised focus-visible:outline-2 focus-visible:outline-ring',
                        type === current ? 'border-belly bg-stone-raised' : 'border-transparent',
                        flagged && 'border-negative',
                      )}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="min-w-0 flex-1 border-l-2 border-transparent px-2 py-1.5 opacity-50">
                      {body}
                      <span className="sr-only"> (pick a rod first)</span>
                    </span>
                  )}
                  {name && (
                    <Button
                      size="icon-sm"
                      variant="quiet"
                      aria-label={`Remove ${label.toLowerCase()}`}
                      onClick={() => remove(type)}
                    >
                      <X />
                    </Button>
                  )}
                </li>
              )
            })}
          </ol>

          <Button className="mt-3 w-full" onClick={goNext}>
            {next.label}
          </Button>
          {next.target === 'summary' ? (
            // Next already goes to the summary, so just show the total
            <p className="mt-2 flex justify-between px-2 py-1.5 text-sm text-ink-2">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </p>
          ) : (
            <Link
              to={basePath}
              className="mt-2 flex justify-between rounded-md px-2 py-1.5 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Review rig</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </Link>
          )}
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </nav>
      </div>

      {/* Small screens: one row of step links, and Next along the bottom */}
      <nav aria-label="Your rig" className="lg:hidden">
        <ol className="flex gap-1 overflow-x-auto text-sm">
          {COMPONENTS.map(({ type, label }) => {
            const filled = Boolean(fullName(type))
            const content = (
              <>
                {filled && <Check aria-hidden className="size-3.5" />}
                {label}
                {filled && <span className="sr-only"> (picked)</span>}
              </>
            )
            return (
              <li key={type}>
                {type === 'rod' || hasRod ? (
                  <Link
                    to={`${basePath}/${type}`}
                    aria-current={type === current ? 'step' : undefined}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring',
                      type === current ? 'font-medium text-ink underline' : 'text-ink-2',
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="flex items-center gap-1 px-2 py-1 whitespace-nowrap text-ink-2 opacity-50">
                    {content}
                    <span className="sr-only"> (pick a rod first)</span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-stone-page/95 px-4 py-3 lg:hidden">
        <Button className="w-full" onClick={goNext}>
          {next.label}
        </Button>
      </div>
    </>
  )
}
