import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

/** How long the catch plays before the builder opens. */
export const CATCH_MS = 450

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * The end of the home page's line: a hook hanging off the tippet, its point
 * caught in Start a build's corner. A plain click sets the hook and lifts the
 * button out, then opens the builder; modifier clicks and reduced motion skip
 * straight to the link. The hook's eye sits 8px in and 8px down, on the
 * steps' line.
 */
export function CatchLink() {
  const navigate = useNavigate()
  const [catching, setCatching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reducedMotion()) return
    e.preventDefault()
    if (timer.current) return
    setCatching(true)
    timer.current = setTimeout(() => navigate('/builder'), CATCH_MS)
  }

  return (
    // pb-5: room for the hook's bend, which hangs below the button
    <div className="relative pb-5 pl-10" data-catching={catching || undefined}>
      {/* The button rises with the hook, tilting a little from the corner
          the hook has caught */}
      <span className="inline-block origin-bottom-left in-data-[catching=true]:motion-safe:animate-catch-raise">
        <Button asChild size="lg">
          <Link to="/builder" onClick={handleClick}>
            Start a build
          </Link>
        </Button>
      </span>

      {/* Over the button, so the point reads as caught in its lower-left
          corner. The sway (on scroll) and the lift (on click) are on separate
          elements, so their transforms don't fight */}
      <span data-testid="hook" aria-hidden="true" className="rig-sway pointer-events-none absolute top-0 left-0 z-10">
        <svg
          viewBox="0 0 60 64"
          width="60"
          height="64"
          fill="none"
          strokeLinecap="round"
          className="block stroke-dorsal-band in-data-[catching=true]:motion-safe:animate-catch-lift"
        >
          {/* Eye on the line (8, 8); shank down past the button; bend under
              it; point up into the button's corner, past its fin edge, with its barb */}
          <circle cx="8" cy="8" r="3" strokeWidth="1.6" />
          <path d="M8 11 V48 C8 63 52 63 52 48 V38" strokeWidth="2" />
          <path d="M52 38 L48.5 42.5" strokeWidth="1.6" />
        </svg>
      </span>
    </div>
  )
}
