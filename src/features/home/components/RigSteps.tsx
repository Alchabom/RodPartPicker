import { useId, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Container, SectionHeading } from '@components/shop'
import { Button } from '@/components/ui/button'

// The step lines mirror the rules in api/app/compatibility/rules.py.
// If a rule changes there, change its line here.
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

export function RigSteps() {
  const headingId = useId()
  return (
    <Container as="section" className="pt-20 pb-16">
      <SectionHeading id={headingId}>How a rig goes together</SectionHeading>
      <ol aria-labelledby={headingId} className="mt-10 grid lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <li key={step.name} className="relative pb-8 pl-10 last:pb-0 lg:pt-8 lg:pr-6 lg:pb-0 lg:pl-0">
            {/* The connector tapers like a leader: 4px, then 3, 2 and 1px. */}
            <span
              aria-hidden="true"
              style={{ '--w': `${step.width}px` } as CSSProperties}
              className="absolute top-7 bottom-1 left-2 w-(--w) -translate-x-1/2 bg-ink-3 lg:top-2.5 lg:right-3 lg:bottom-auto lg:left-7 lg:h-(--w) lg:w-auto lg:translate-x-0 lg:-translate-y-1/2"
            />
            <span className="absolute top-0 left-0 w-4 text-center text-[13px] leading-5 font-medium text-ink-2 tabular-nums">
              {i + 1}
            </span>
            <h3 className="text-[15px] leading-5 font-medium text-ink">{step.name}</h3>
            <p className="mt-1 text-sm text-ink-2">{step.line}</p>
          </li>
        ))}
      </ol>
      <Button asChild variant="link" className="mt-10">
        <Link to="/builder">Start a build</Link>
      </Button>
    </Container>
  )
}
