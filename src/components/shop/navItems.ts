export type NavTarget = '/builder' | '/my-builds' | '/rack'

export const NAV_ITEMS: { to: NavTarget; label: string; requiresAuth?: boolean }[] = [
  { to: '/builder', label: 'Builder' },
  { to: '/my-builds', label: 'My builds', requiresAuth: true },
  { to: '/rack', label: 'Community Rack' },
]

export function visibleNavItems(signedIn: boolean) {
  return NAV_ITEMS.filter((item) => !item.requiresAuth || signedIn)
}

// The draft's step paths (/builder/rod …), which the shop layer can't import
// from the builder feature. Any other segment after /builder/ is a saved
// build's id, valid or not, so it belongs to My builds
const BUILDER_STEPS = new Set(['rod', 'reel', 'line', 'leader', 'tippet'])

/**
 * The section a path belongs to. A saved build (/builder/42…) belongs to My
 * builds, where it lives; the draft's steps and summary belong to Builder.
 * Matches the way the router does: ignoring case and a trailing slash.
 */
export function activeNavItem(rawPathname: string): NavTarget | null {
  const pathname = rawPathname.toLowerCase().replace(/\/+$/, '')
  const [, first, second] = pathname.split('/')
  if (first === 'builder') return second === undefined || BUILDER_STEPS.has(second) ? '/builder' : '/my-builds'
  if (first === 'my-builds' && second === undefined) return '/my-builds'
  if (first === 'rack') return '/rack'
  return null
}

/** The Builder link's draft count: "3 of 5" while picking, "ready" when all five are in. */
export function builderLabel(picked: number): { pill: string | null; accessibleName: string } {
  if (picked >= 5) return { pill: 'ready', accessibleName: 'Builder, rig ready' }
  if (picked > 0) return { pill: `${picked} of 5`, accessibleName: `Builder, ${picked} of 5 picked` }
  return { pill: null, accessibleName: 'Builder' }
}
