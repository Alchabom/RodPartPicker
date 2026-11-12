import { Link, useLocation } from 'react-router'
import { UserIcon } from 'lucide-react'
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
      <Link
        to={`/login?next=${encodeURIComponent(here)}`}
        className="font-semibold text-tasman transition-colors duration-200 hover:text-sulu"
      >
        Log in
      </Link>
    )
  }

  return (
    <DropdownMenu>
      {/* No aria-label: the visible name is the button's name (WCAG 2.5.3) */}
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md font-semibold text-tasman outline-none transition-colors duration-200 hover:text-sulu focus-visible:ring-2 focus-visible:ring-sulu"
      >
        <UserIcon className="size-5" aria-hidden />
        <span>{user.displayName ?? user.email}</span>
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
