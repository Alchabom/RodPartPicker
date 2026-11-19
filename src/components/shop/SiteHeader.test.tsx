import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import { SiteHeader } from './SiteHeader'

function renderAt(path: string, account: ReactNode = <span>Log in</span>) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader account={account} />
    </MemoryRouter>,
  )
}

describe('SiteHeader', () => {
  it.each([
    ['/builder', 'Builder'],
    ['/builder/12/rod/all', 'Builder'],
    ['/rack', 'Completed builds'],
    ['/rack/5', 'Completed builds'],
  ])('marks the link for %s as current', (path, label) => {
    renderAt(path)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
  })

  it('marks nothing on the home page', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { current: 'page' })).toBeNull()
  })

  it('opens the mobile menu and closes it on navigation', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const sheet = screen.getByRole('dialog', { name: 'Menu' })
    await user.click(within(sheet).getByRole('link', { name: 'Completed builds' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the account slot and lets it truncate', () => {
    renderAt('/', <span>a-very-long-display-name-that-goes-on@example.com</span>)
    const account = screen.getByText(/a-very-long-display-name/)
    expect(account.parentElement).toHaveClass('min-w-0')
  })

  it('has no Products link', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: 'Products' })).toBeNull()
  })
})
