import { render, screen } from '@testing-library/react'
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
