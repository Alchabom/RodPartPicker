import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Container } from './Container'
import { activeNavItem, builderLabel, visibleNavItems, type NavTarget } from './navItems'
import { Wordmark } from './Wordmark'

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** The Builder link's count pill, read out through the link's label instead. */
function BuilderPill({ picked }: { picked: number }) {
  const { pill } = builderLabel(picked)
  if (!pill) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        'ml-1.5 rounded-full px-1.5 text-xs font-medium',
        pill === 'ready' ? 'bg-recommended-wash text-recommended-ink' : 'bg-stone-raised text-ink-2',
      )}
    >
      {pill}
    </span>
  )
}

export function SiteHeader({
  account,
  signedIn,
  builderProgress = 0,
}: {
  account: ReactNode
  signedIn: boolean
  builderProgress?: number // parts in the local draft, from the route layout
}) {
  const items = visibleNavItems(signedIn)
  const { pathname } = useLocation()
  const active = activeNavItem(pathname)
  const linkProps = (to: NavTarget) => ({
    'aria-current': active === to ? ('page' as const) : undefined,
    'aria-label': to === '/builder' ? builderLabel(builderProgress).accessibleName : undefined,
  })
  // The menu belongs to the page it was opened on, so any navigation
  // (a link, back or forward) closes it without an effect
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null)

  return (
    <header className="border-b border-hairline bg-stone-page">
      <Container className="flex h-14 items-center gap-6">
        <Wordmark className="text-ink" />

        <nav aria-label="Main" className="hidden h-full items-stretch gap-6 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              {...linkProps(item.to)}
              className={cn(
                'flex items-center border-b-2 text-sm font-medium transition-colors duration-150',
                focusRing,
                active === item.to ? 'border-belly text-ink' : 'border-transparent text-ink-2 hover:text-ink',
              )}
            >
              {item.label}
              {item.to === '/builder' && <BuilderPill picked={builderProgress} />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="min-w-0">{account}</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="quiet" size="icon" aria-label="Menu" className="md:hidden">
                <MenuIcon aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Menu" className="flex flex-col gap-1 px-4">
                {items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    {...linkProps(item.to)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-base font-medium transition-colors duration-150',
                      focusRing,
                      active === item.to ? 'bg-haze-5/10 text-ink' : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    {item.label}
                    {item.to === '/builder' && <BuilderPill picked={builderProgress} />}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
