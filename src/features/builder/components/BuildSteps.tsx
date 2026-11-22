import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { COMPONENTS } from '../api/components'
import { useBuild } from '../hooks/useBuild'
import { useBuildCheck } from '../hooks/useBuildCheck'
import { useCatalog } from '../hooks/useCatalog'
import type { ComponentType } from '../types'

type StepState = 'picked' | 'empty' | 'flagged'

const RING: Record<StepState, string> = {
  picked: 'border-belly bg-belly',
  empty: 'border-dorsal-band bg-stone-page',
  flagged: 'border-2 border-negative bg-stone-page',
}

/**
 * The guided builder's progress: five guide rings on a line, rod to tippet.
 * A ring fills when its part is picked and turns red when the part no longer
 * fits. Every step but the rod waits for a rod, since everything is matched to it.
 */
export function BuildSteps({ current }: { current: ComponentType | 'summary' }) {
  const { build, basePath } = useBuild()
  const { getPart } = useCatalog()
  const { flags } = useBuildCheck()
  const hasRod = getPart(build.rod) !== undefined

  return (
    <nav aria-label="Build steps">
      <ol className="flex items-start">
        {COMPONENTS.map(({ type, label }, i) => {
          const state: StepState = flags.byPart[type]
            ? 'flagged'
            : getPart(build[type])
              ? 'picked'
              : 'empty'
          const isCurrent = type === current
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 size-3.5 rounded-full border-[1.5px]',
                  RING[state],
                  isCurrent && 'ring-2 ring-ink/70 ring-offset-2 ring-offset-stone-page',
                )}
              />
              <span className={cn('text-xs', isCurrent ? 'font-medium text-ink' : 'text-ink-2')}>{label}</span>
            </>
          )
          const itemClass = 'flex flex-col items-center gap-1.5 rounded-md px-1 py-1'
          return (
            <li key={type} data-state={state} className="relative flex flex-1 justify-center">
              {/* The line between rings, from this ring's center to the next one's */}
              {i < COMPONENTS.length - 1 && (
                <span aria-hidden="true" className="absolute top-[calc(0.25rem+6px)] left-1/2 h-0.5 w-full bg-belly" />
              )}
              {type === 'rod' || hasRod ? (
                <Link
                  to={`${basePath}/${type}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(itemClass, 'hover:bg-stone-raised focus-visible:outline-2 focus-visible:outline-ring')}
                >
                  {inner}
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(itemClass, 'opacity-50')}>
                  {inner}
                  <span className="sr-only"> (pick a rod first)</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
