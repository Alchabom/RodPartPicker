import { useId } from 'react'

// The Blue Ridge at first light: a stone-page → dawn sky, a pale sun and five
// ridges fading into haze, far (haze-1) to near (haze-5).
export function RidgeScene() {
  const skyId = useId()
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
      </defs>
      <rect width="1200" height="460" fill={`url(#${skyId})`} />
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
