import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Container } from '@components/shop'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RidgeScene } from './RidgeScene'
import { RecentBuilds } from './RecentBuilds'
import { RigSteps } from './RigSteps'

// The entrance (text rise, line draw) plays on the first visit to `/` per page
// load, not every time someone comes back to it inside the app.
let entrancePlayed = false

export function HomePage() {
  const [entrance] = useState(() => !entrancePlayed)
  useEffect(() => {
    entrancePlayed = true
  }, [])
  const rise = (delay?: string) => entrance && cn('motion-safe:animate-rise', delay)

  return (
    <main className="flex flex-1 flex-col">
      {/* From md: fills the first screen under the 56px header, up to 960px.
          Narrower: 680px, so the ridges start just under the actions */}
      <section className="relative flex min-h-[680px] flex-col md:min-h-[min(calc(100svh-56px),960px)]">
        <RidgeScene drawCast={entrance} />
        <Container className="relative">
          <div className="max-w-[600px] pt-10 md:pt-14">
            <h1 className={cn('text-[40px] leading-[1.06] font-medium tracking-[-0.02em] text-olive md:text-[52px]', rise())}>
              Rig a fly rod where every part fits
            </h1>
            <p className={cn('mt-4 max-w-[30rem] text-lg leading-7 text-ink-2', rise('motion-safe:[animation-delay:50ms]'))}>
              Pick a rod, reel, line, leader and tippet. We check each part against the rest of your rig and tell you
              why it fits.
            </p>
            <div className={cn('mt-6 flex flex-wrap items-center gap-5', rise('motion-safe:[animation-delay:100ms]'))}>
              <Button asChild size="lg">
                <Link to="/builder">Start a build</Link>
              </Button>
              <Button asChild variant="link" size="lg">
                <Link to="/builds">See completed builds</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
      <RigSteps />
      <RecentBuilds />
    </main>
  )
}
