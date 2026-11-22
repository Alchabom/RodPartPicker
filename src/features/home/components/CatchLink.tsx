import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

/** How long the catch plays before the builder opens. */
export const CATCH_MS = 450

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * The end of the home page's line: a hook hanging off the tippet beside
 * Start a build. A plain click sets the hook and lands a brook trout, then
 * opens the builder; modifier clicks and reduced motion skip straight to the
 * link. The hook's eye sits 8px in and 8px down, on the steps' line.
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
      {/* The sway (on scroll) and the set (on click) are on separate elements,
          so their transforms don't fight */}
      <span data-testid="hook" aria-hidden="true" className="rig-sway absolute top-[3px] left-[3px]">
        <svg
          viewBox="0 0 20 40"
          width="20"
          height="40"
          fill="none"
          strokeLinecap="round"
          className="block stroke-dorsal-band in-data-[catching=true]:motion-safe:animate-catch-set"
        >
          <circle cx="5" cy="5" r="2.6" strokeWidth="1.3" />
          <path d="M5 7.6 V28 C5 37 15 37 15 28 V23" strokeWidth="1.6" />
          <path d="M15 23 L12.4 26.2" strokeWidth="1.2" />
        </svg>
      </span>

      {/* Head up on the hook point: the svg's origin is the trout's mouth */}
      <span data-testid="fish" aria-hidden="true" className="pointer-events-none absolute top-[26px] left-2">
        <svg
          viewBox="-10 -4 20 66"
          width="20"
          height="66"
          className="block origin-top opacity-0 in-data-[catching=true]:motion-safe:animate-catch-leap"
        >
          <g transform="scale(0.8) translate(10 0) rotate(90)">
            <path className="fill-olive" d="M0 10 C10 0 40 -2 58 6 L72 0 L70 10 L72 20 L58 14 C40 22 10 20 0 10Z" />
            <path className="fill-belly" d="M4 12 C14 19 40 20 58 13 C40 17 14 17 4 12Z" />
            <path className="fill-belly stroke-stone-card" strokeWidth="0.8" d="M22 17 l-4 7 l8 -5Z" />
            <circle className="fill-spot stroke-halo" cx="30" cy="9" r="1.6" strokeWidth="1" />
            <circle className="fill-spot stroke-halo" cx="44" cy="11" r="1.6" strokeWidth="1" />
            <circle className="fill-stone-card" cx="9" cy="8.5" r="1.3" />
          </g>
        </svg>
        <svg
          viewBox="0 0 48 10"
          width="48"
          height="10"
          fill="none"
          className="-mt-1 -ml-[14px] block opacity-0 in-data-[catching=true]:motion-safe:animate-catch-splash"
        >
          <ellipse cx="24" cy="5" rx="22" ry="4" className="stroke-halo" />
          <ellipse cx="24" cy="5" rx="12" ry="2.2" className="stroke-halo" />
        </svg>
      </span>

      <Button asChild size="lg" className="in-data-[catching=true]:translate-y-px">
        <Link to="/builder" onClick={handleClick}>
          Start a build
        </Link>
      </Button>
    </div>
  )
}
