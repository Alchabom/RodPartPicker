import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('gives the wordmark a light focus ring on the dark band', () => {
    render(<MemoryRouter><SiteFooter signedIn={false} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'RodPartPicker' })).toHaveClass('focus-visible:ring-stone-page')
  })

  it('shows the footer line from the spec', () => {
    render(<MemoryRouter><SiteFooter signedIn={false} /></MemoryRouter>)
    expect(
      screen.getByText("A capstone project. Prices and links come from each brand's own site."),
    ).toBeInTheDocument()
  })

  it.each([
    [false, ['Builder', 'Community Rack']],
    [true, ['Builder', 'My builds', 'Community Rack']],
  ])('lists footer nav links when signedIn is %s', (signedIn, labels) => {
    render(<MemoryRouter><SiteFooter signedIn={signedIn} /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(labels)
  })
})
