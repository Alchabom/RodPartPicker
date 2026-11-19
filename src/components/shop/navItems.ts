export const NAV_ITEMS: { to: string; label: string; requiresAuth?: boolean }[] = [
  { to: '/builder', label: 'Builder' },
  { to: '/my-builds', label: 'My builds', requiresAuth: true },
  { to: '/rack', label: 'Community Rack' },
]

export function visibleNavItems(signedIn: boolean) {
  return NAV_ITEMS.filter((item) => !item.requiresAuth || signedIn)
}
