import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Container } from './Container'
import { NAV_ITEMS } from './navItems'
import { Wordmark } from './Wordmark'

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function SiteHeader({ account }: { account: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b border-hairline bg-stone-page">
      <Container className="flex h-14 items-center gap-6">
        <Wordmark className="text-ink" />

        <nav aria-label="Main" className="hidden h-full items-stretch gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center border-b-2 text-sm font-medium transition-colors duration-150',
                  focusRing,
                  isActive
                    ? 'border-belly text-ink'
                    : 'border-transparent text-ink-2 hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
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
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-base font-medium transition-colors duration-150',
                        focusRing,
                        isActive ? 'bg-haze-5/10 text-ink' : 'text-ink-2 hover:text-ink',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
