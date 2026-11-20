import { useId } from 'react'
import { cn } from '@/lib/utils'
import {
  CAST_ROUTE,
  FLY,
  GUIDES,
  LINE_OUTLINE,
  ROD_PATH,
  ROD_WIDTH,
  guideLegs,
} from '../utils/castGeometry'

// The Blue Ridge at first light: a stone-page → dawn sky, a pale sun and five
// ridges fading into haze, far (haze-1) to near (haze-5). A small fly rod rises
// from behind the second-nearest ridge, and its line runs up through five guides
// into a cast between the far and near ridges. `drawCast` draws the line in once;
// the rod and guides are there from the start.
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
      {/* The rod, line and guides are hidden below lg, where the slice crop would
          leave a stray diagonal. The line sits between the rod and its guides,
          so each guide's ring is drawn over it */}
      <path
        data-testid="rod"
        d={ROD_PATH}
        fill="none"
        strokeWidth={ROD_WIDTH}
        strokeLinecap="round"
        className="hidden stroke-dorsal-band lg:block"
      />
      <g data-testid="cast" className="hidden lg:block" mask={`url(#${maskId})`}>
        <path d={LINE_OUTLINE} fillOpacity={0.9} className="fill-belly" />
        <circle cx={FLY.x} cy={FLY.y} r={FLY.r} className="fill-olive" />
      </g>
      <g data-testid="guides" fill="none" strokeLinecap="round" className="hidden stroke-dorsal-band lg:block">
        {GUIDES.map((guide) => (
          <g key={guide.t}>
            {guideLegs(guide).map(([foot, edge]) => (
              <path key={`${foot.x} ${foot.y}`} d={`M${foot.x} ${foot.y} L${edge.x} ${edge.y}`} strokeWidth={0.5} />
            ))}
            <circle cx={guide.ring.x} cy={guide.ring.y} r={guide.ring.r} strokeWidth={0.45} />
          </g>
        ))}
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
