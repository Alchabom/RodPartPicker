import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import { SiteHeader } from './SiteHeader'

function renderAt(
  path: string,
  { signedIn = false, account = <span>Log in</span> }: { signedIn?: boolean; account?: ReactNode } = {},
) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader account={account} signedIn={signedIn} />
    </MemoryRouter>,
  )
}

describe('SiteHeader', () => {
  it.each([
    ['/builder', 'Builder'],
    ['/builder/12/rod/all', 'Builder'],
    ['/my-builds', 'My builds'],
    ['/rack', 'Community Rack'],
    ['/rack/5', 'Community Rack'],
  ])('marks only %s as %s', (path, label) => {
    renderAt(path, { signedIn: true })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page')
    expect(current.map((l) => l.textContent)).toEqual([label])
  })

  it('hides My builds when signed out', () => {
    renderAt('/', { signedIn: false })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Builder', 'Community Rack'])
  })

  it.each([
    [true, ['Builder', 'My builds', 'Community Rack']],
    [false, ['Builder', 'Community Rack']],
  ])('lists the mobile menu links when signedIn is %s', async (signedIn, labels) => {
    const user = userEvent.setup()
    renderAt('/', { signedIn })
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const sheet = screen.getByRole('dialog', { name: 'Menu' })
    const nav = within(sheet).getByRole('navigation', { name: 'Menu' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(labels)
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
    await user.click(within(sheet).getByRole('link', { name: 'Community Rack' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the account slot and lets it truncate', () => {
    renderAt('/', { account: <span>a-very-long-display-name-that-goes-on@example.com</span> })
    const account = screen.getByText(/a-very-long-display-name/)
    expect(account.parentElement).toHaveClass('min-w-0')
  })

  it('has no Products link', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: 'Products' })).toBeNull()
  })
})
