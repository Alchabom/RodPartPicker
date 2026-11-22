import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

/** How long the catch plays before the builder opens. */
export const CATCH_MS = 450

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * The end of the home page's line: a hook hanging off the tippet beside
 * Start a build. A plain click swings the hook in to catch the button and lift
 * it, then opens the builder; modifier clicks and reduced motion skip straight
 * to the link. The hook hangs from a pivot 8px in and 16px above this box,
 * where the steps' line ends.
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
    <div className="relative pl-10" data-catching={catching || undefined}>
      {/* The button rises with the hook, tilting a little from the edge the
          hook has caught */}
      <span className="inline-block origin-left in-data-[catching=true]:motion-safe:animate-catch-raise">
        <Button asChild size="lg">
          <Link to="/builder" onClick={handleClick}>
            Start a build
          </Link>
        </Button>
      </span>

      {/* The hook hangs on the last inch of tippet from a pivot 16px above
          this box, where the steps' line ends. On the catch it swings in on
          that pivot, over the button, catches its edge and lifts it. The sway
          (on scroll) and the swing (on click) are on separate elements, so
          their transforms don't fight */}
      <span
        data-testid="hook"
        aria-hidden="true"
        className="rig-sway pointer-events-none absolute -top-[21px] left-[3px] z-10"
      >
        <svg
          viewBox="0 0 20 64"
          width="20"
          height="64"
          fill="none"
          strokeLinecap="round"
          className="block origin-[5px_5px] in-data-[catching=true]:motion-safe:animate-catch-swing"
        >
          <path d="M5 5 V26.4" strokeWidth="1" className="stroke-belly" />
          <g className="stroke-dorsal-band">
            <circle cx="5" cy="29" r="2.6" strokeWidth="1.3" />
            <path d="M5 31.6 V53 C5 62 15 62 15 53 V48" strokeWidth="1.6" />
            <path d="M15 48 L12.4 51.2" strokeWidth="1.2" />
          </g>
        </svg>
      </span>
    </div>
  )
}
