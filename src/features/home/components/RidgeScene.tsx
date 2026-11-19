import { useId } from 'react'
import { cn } from '@/lib/utils'

// The cast, as one route: the rod leg rises out of the valley, turns over in a
// tight loop, and the fly leg lies back above it. Each piece below follows
// this route and gets thinner, line → leader → tippet.
const LEGS = {
  rod: 'M600 470 C680 360 760 262 856 232',
  loop: 'C870 228 878 224 878 219.5 C878 215.5 870 214 860 214.5',
  fly: 'C810 216 770 213 735 210',
  leader: 'C716 209 703 208 692 208',
  tippet: 'C684 208 679 208.5 675 209',
}
// Kept inside x 270–930 so the slice crop shows all of it from 1024px wide,
// right of and below the hero text
const CAST_ROUTE = Object.values(LEGS).join(' ')

const CAST_PIECES = [
  { d: LEGS.rod, width: 1.2 },
  { d: `M856 232 ${LEGS.loop}`, width: 1.1 },
  { d: `M860 214.5 ${LEGS.fly}`, width: 0.9 },
  { d: `M735 210 ${LEGS.leader}`, width: 0.65 },
  { d: `M692 208 ${LEGS.tippet}`, width: 0.45 },
]

// The Blue Ridge at first light: a stone-page → dawn sky, a pale sun and five
// ridges fading into haze, far (haze-1) to near (haze-5), with a fly-line cast
// between the far and near ridges. `drawCast` draws the line in once.
export function RidgeScene({ drawCast = false }: { drawCast?: boolean }) {
  const skyId = useId()
  const maskId = useId()
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 460"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--stone-page)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--dawn)' }} />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="460">
          <path
            d={CAST_ROUTE}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={10}
            strokeLinecap="round"
            // Dash 1, gap 2: hidden at offset 1 the only dash end is the route's
            // start, behind the near ridges, so no stray cap shows at the fly
            strokeDasharray="1 2"
            className={cn(drawCast && 'motion-safe:animate-cast')}
          />
        </mask>
      </defs>
      <rect width="1200" height="460" fill={`url(#${skyId})`} />
      {/* The sun's pale gold has no token: it appears nowhere else */}
      <circle cx="930" cy="230" r="30" fill="#F6E7C9" />
      <path
        className="fill-haze-1"
        d="M0 270 C120 240 200 222 300 238 S480 208 560 222 S760 188 860 208 S1060 198 1200 216 V460 H0Z"
      />
      <path
        className="fill-haze-2"
        d="M0 304 C90 282 180 272 260 288 S420 258 520 276 S700 252 800 268 S1000 244 1200 264 V460 H0Z"
      />
      <path
        className="fill-haze-3"
        d="M0 342 C110 318 210 320 300 330 S470 300 580 320 S760 304 880 318 S1060 290 1200 308 V460 H0Z"
      />
      {/* Hidden below lg, where the slice crop would leave a stray diagonal */}
      <g data-testid="cast" className="hidden lg:block" mask={`url(#${maskId})`}>
        <g fill="none" strokeLinecap="round" strokeOpacity={0.9} className="stroke-belly">
          {CAST_PIECES.map((piece) => (
            <path key={piece.d} d={piece.d} strokeWidth={piece.width} />
          ))}
        </g>
        <circle cx="672.5" cy="209.2" r="1.4" className="fill-olive" />
      </g>
      <path
        className="fill-haze-4"
        d="M0 380 C120 360 220 366 320 372 S520 344 640 362 S840 350 960 360 S1110 344 1200 354 V460 H0Z"
      />
      <path
        className="fill-haze-5"
        d="M0 422 C140 406 260 412 380 416 S600 398 720 408 S960 400 1080 408 S1160 402 1200 404 V460 H0Z"
      />
    </svg>
  )
}
