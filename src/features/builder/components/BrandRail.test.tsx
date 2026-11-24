import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BrandRail } from './BrandRail'

const BRANDS = [
  { id: 'lamson', name: 'Lamson' },
  { id: 'orvis', name: 'Orvis' },
]

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="at">{pathname + search}</p>
}

function renderRail(path: string, brands = BRANDS, current = 'all') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <BrandRail brands={brands} current={current} />
      <Where />
    </MemoryRouter>,
  )
}

describe('BrandRail', () => {
  it('links each brand, keeping the other search params', () => {
    renderRail('/builder/reel?x=1')
    const nav = screen.getByRole('navigation', { name: 'Brands' })
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Lamson' }))
    expect(screen.getByRole('link', { name: 'Lamson' })).toHaveAttribute('href', '/builder/reel?x=1&brand=lamson')
    expect(screen.getByRole('link', { name: 'All brands' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks the brand being shown', () => {
    renderRail('/builder/reel?brand=orvis', BRANDS, 'orvis')
    expect(screen.getByRole('link', { name: 'Orvis' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'All brands' })).not.toHaveAttribute('aria-current')
  })

  it('is hidden when there is only one brand', () => {
    renderRail('/builder/reel', [BRANDS[0]])
    expect(screen.queryByRole('navigation', { name: 'Brands' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Brand' })).not.toBeInTheDocument()
  })

  it('filters from a select on small screens', async () => {
    renderRail('/builder/reel?x=1')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Brand' }), 'orvis')
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/reel?x=1&brand=orvis')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Brand' }), 'all')
    expect(screen.getByTestId('at')).toHaveTextContent(/^\/builder\/reel\?x=1$/)
  })
})
