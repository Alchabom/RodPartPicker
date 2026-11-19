export const NAV_ITEMS: { to: string; label: string; requiresAuth?: boolean }[] = [
  { to: '/builder', label: 'Builder' },
  { to: '/my-builds', label: 'My builds', requiresAuth: true },
  { to: '/rack', label: 'Community Rack' },
]
