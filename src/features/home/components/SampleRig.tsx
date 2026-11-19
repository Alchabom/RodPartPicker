import { FinEdge, FitSpot, PriceTag, SpecLine } from '@components/shop'
import { cn } from '@/lib/utils'
import { SAMPLE_RIG } from '../utils/sampleRig'

// A static build card for the hero. The line row is the part being worked on.
export function SampleRig({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-hairline bg-stone-card p-2 shadow-[0_8px_24px_rgb(0_0_0/0.08)]',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4 px-3 pt-3 pb-2">
        <p className="text-[15px] font-medium text-ink">{SAMPLE_RIG.title}</p>
        <p className="text-[13px] text-ink-3 tabular-nums">3 of 5 parts</p>
      </div>
      {SAMPLE_RIG.parts.map((part, i) => {
        const active = part.type === 'line'
        return (
          <div
            key={part.type}
            className={cn(
              'relative grid-cols-[48px_1fr_auto] md:grid-cols-[56px_1fr_auto] items-center gap-3 rounded-[6px] py-3 pr-3 pl-5 text-sm',
              i > 0 && 'border-t border-hairline',
              active ? 'hidden bg-stone-raised md:grid' : 'grid',
            )}
          >
            {active && <FinEdge />}
            <span className="text-[13px] text-ink-3">{part.label}</span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 text-ink">
                {part.name}
                {part.type !== 'rod' && (
                  <span className="inline-flex items-center gap-2 text-xs text-ink-2">
                    <FitSpot decorative />
                    Fits
                  </span>
                )}
              </p>
              <SpecLine specs={part.specs} />
            </div>
            <PriceTag price={part.price} className="text-ink" />
          </div>
        )
      })}
    </div>
  )
}
