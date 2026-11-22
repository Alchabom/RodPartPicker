export type NavTarget = '/builder' | '/my-builds' | '/rack'

export const NAV_ITEMS: { to: NavTarget; label: string; requiresAuth?: boolean }[] = [
  { to: '/builder', label: 'Builder' },
  { to: '/my-builds', label: 'My builds', requiresAuth: true },
  { to: '/rack', label: 'Community Rack' },
]

export function visibleNavItems(signedIn: boolean) {
  return NAV_ITEMS.filter((item) => !item.requiresAuth || signedIn)
}

/**
 * The section a path belongs to. A saved build (/builder/42…) belongs to My
 * builds, where it lives; the draft's steps and summary belong to Builder.
 */
export function activeNavItem(pathname: string): NavTarget | null {
  if (/^\/builder\/\d+(\/|$)/.test(pathname)) return '/my-builds'
  if (pathname === '/builder' || pathname.startsWith('/builder/')) return '/builder'
  if (pathname === '/my-builds') return '/my-builds'
  if (pathname === '/rack' || pathname.startsWith('/rack/')) return '/rack'
  return null
}

/** The Builder link's draft count: "3 of 5" while picking, "ready" when all five are in. */
export function builderLabel(picked: number): { pill: string | null; accessibleName: string } {
  if (picked >= 5) return { pill: 'ready', accessibleName: 'Builder, rig ready' }
  if (picked > 0) return { pill: `${picked} of 5`, accessibleName: `Builder, ${picked} of 5 picked` }
  return { pill: null, accessibleName: 'Builder' }
}
