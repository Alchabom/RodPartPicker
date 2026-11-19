import { Link } from 'react-router'
import { Container } from '@components/shop'
import { Button } from '@/components/ui/button'
import { RidgeScene } from './RidgeScene'
import { RecentBuilds } from './RecentBuilds'
import { RigSteps } from './RigSteps'
import { SampleRig } from './SampleRig'

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Fills the first screen under the 56px header, up to 960px */}
      <section className="relative flex min-h-[min(calc(100svh-56px),960px)] flex-col">
        <RidgeScene />
        <Container className="relative flex flex-1 flex-col gap-10">
          <div className="max-w-[600px] pt-10 md:pt-14">
            <h1 className="text-[40px] leading-[1.06] font-medium tracking-[-0.02em] text-olive motion-safe:animate-rise md:text-[52px]">
              Rig a fly rod where every part fits
            </h1>
            <p className="mt-4 max-w-[30rem] text-lg leading-7 text-ink-2 motion-safe:animate-rise motion-safe:[animation-delay:50ms]">
              Pick a rod, reel, line, leader and tippet. We check each part against the rest of your rig and tell you
              why it fits.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 motion-safe:animate-rise motion-safe:[animation-delay:100ms]">
              <Button asChild size="lg">
                <Link to="/builder">Start a build</Link>
              </Button>
              <Button asChild variant="link" size="lg">
                <Link to="/builds">See completed builds</Link>
              </Button>
            </div>
          </div>
          {/* Rises out of the nearest ridge and overhangs the hero by 36px */}
          <SampleRig className="mt-auto -mb-9 md:w-[440px] md:self-end" />
        </Container>
      </section>
      <RigSteps />
      <RecentBuilds />
    </main>
  )
}
