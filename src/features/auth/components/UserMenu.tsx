import { Link, useLocation } from 'react-router'
import { UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { useAuth } from '@hooks/auth'

/** The navbar's account control: "Log in" when signed out, a menu when in. */
export function UserMenu() {
  const { status, user, signOut } = useAuth()
  const location = useLocation()

  // Keep the space while the session loads, so the navbar doesn't jump
  if (status === 'loading') return <span className="size-5" aria-hidden />

  if (status === 'anonymous' || !user) {
    // Come back to this page after logging in (but not to /login itself)
    const here = location.pathname === '/login' ? '/' : location.pathname + location.search
    return (
      <Button asChild variant="link">
        <Link to={`/login?next=${encodeURIComponent(here)}`}>Log in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      {/* No aria-label: the visible name is the button's name (WCAG 2.5.3) */}
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" className="max-w-full">
          <UserIcon className="size-5" aria-hidden />
          <span className="max-w-40 truncate">{user.displayName ?? user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/builder/saved">My Builds</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
