import { useId, type CSSProperties } from 'react'
import { SectionHeading } from '@components/shop'
import { CatchLink } from './CatchLink'

// The step lines mirror the rules in api/app/compatibility/rules.py.
// If a rule changes there, change its line here.
// `width` is the line below each step: it tapers like a leader, 4px down to 1px
const STEPS = [
  { name: 'Rod', line: 'Sets the line weight and the water for everything after it.', width: 4 },
  { name: 'Reel', line: 'Its rated range has to include the rod’s weight.', width: 4 },
  {
    name: 'Line',
    line: 'The same weight as the rod, or one up for a fast rod, and inside the reel’s range.',
    width: 3,
  },
  { name: 'Leader', line: 'Heavy leaders (10 lb and up) only go on 7 wt rods and heavier.', width: 2 },
  { name: 'Tippet', line: 'The same X size as the leader’s tip, or one size finer.', width: 1 },
]

// The line runs 8px in from the column's left edge (left-2), and the text
// starts at pl-10. Each marker's ring is centered 10px down, on its h3
const segment = 'absolute left-2 -translate-x-1/2 bg-belly'

/**
 * How a rig goes together, as one fly line: it comes down from the hero (see
 * RigBridge), passes through a guide ring at each part, tapers like a leader
 * and ends in the hook beside Start a build.
 */
export function RigSteps() {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="rig-steps min-w-0">
      {/* From lg the bridge lands beside the heading; below lg the line starts
          at the Rod, and the heading lines up with Recently rigged */}
      <div className="relative pb-8 lg:pl-10">
        <span aria-hidden="true" className={`${segment} top-0 -bottom-2.5 hidden w-1 lg:block`} />
        <SectionHeading id={headingId}>How a rig goes together</SectionHeading>
      </div>
      <ol aria-labelledby={headingId}>
        {STEPS.map((step, i) => {
          const last = i === STEPS.length - 1
          return (
            <li key={step.name} className="relative pb-8 pl-10">
              <span
                data-segment
                aria-hidden="true"
                style={{ width: `${step.width}px` } as CSSProperties}
                // The tippet ends on the hook's eye, 8px into the CatchLink below
                className={`${segment} rig-draw top-2.5 ${last ? 'rig-tippet -bottom-2' : '-bottom-2.5'}`}
              />
              <svg
                data-marker
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="16"
                height="16"
                className="absolute top-0.5 left-0 overflow-visible"
              >
                <circle cx="8" cy="8" r="5" fill="none" strokeWidth="1.5" className="stroke-dorsal-band" />
              </svg>
              <div className="rig-rise">
                <h3 className="text-[15px] leading-5 font-medium text-ink">{step.name}</h3>
                <p className="mt-1 max-w-[34rem] text-sm text-ink-2">{step.line}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <CatchLink />
    </section>
  )
}

/**
 * The slack from the hero, swinging from the page's center (where the hero's
 * line leaves the scene) into the steps' line. It fills the top padding (pt-20)
 * of the home page's centered Container: from the line (the container's 24px
 * padding + 8px) to 50% of its width, the viewport's center.
 */
export function RigBridge() {
  return (
    // Revealed by clipping the box top-down (rig-bridge), not by dashing the
    // path: Chrome mis-measures dashes on a non-scaling stroke
    <div aria-hidden="true" className="rig-bridge absolute top-0 right-1/2 left-[calc(1.5rem+8px)] hidden h-20 lg:block">
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="block size-full overflow-visible">
        <path
          d="M100 0 C100 48 0 32 0 80"
          fill="none"
          stroke="var(--belly)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
