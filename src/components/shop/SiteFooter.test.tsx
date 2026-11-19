import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('gives the wordmark a light focus ring on the dark band', () => {
    render(<MemoryRouter><SiteFooter /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'RodPartPicker' })).toHaveClass('focus-visible:ring-stone-page')
  })

  it('shows the footer line from the spec', () => {
    render(<MemoryRouter><SiteFooter /></MemoryRouter>)
    expect(
      screen.getByText("A capstone project. Prices and links come from each brand's own site."),
    ).toBeInTheDocument()
  })
})
