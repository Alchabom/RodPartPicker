import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '@hooks/auth'
import { RequireAuth } from './RequireAuth'
import { UserMenu } from './UserMenu'

vi.mock('@hooks/auth', () => ({ useAuth: vi.fn() }))

function loading() {
  vi.mocked(useAuth).mockReturnValue({ status: 'loading', user: null } as unknown as ReturnType<typeof useAuth>)
}

describe('UserMenu while the session loads', () => {
  it('holds the width of "Log in" so the header does not shift', () => {
    loading()
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    )
    const placeholder = screen.getByTestId('account-skeleton')
    expect(placeholder).toHaveClass('w-14')
    expect(placeholder).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  })
})

describe('RequireAuth while the session loads', () => {
  it('shows a page skeleton instead of a blank page', () => {
    loading()
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>Secret</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('Secret')).toBeNull()
  })
})

describe('UserMenu when signed in', () => {
  it('has no My Builds item (it lives in the main nav)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { email: 'a@b.co', displayName: 'Ann' },
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>)
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: /Ann/ }))
    expect(screen.getByRole('menuitem', { name: 'Account settings' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /my builds/i })).toBeNull()
  })
})
