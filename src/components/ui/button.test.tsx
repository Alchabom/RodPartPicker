import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('defaults to the primary variant and md size', () => {
    render(<Button>Start a build</Button>)
    const button = screen.getByRole('button', { name: 'Start a build' })
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(button).toHaveAttribute('data-size', 'md')
  })
  it('renders a link with asChild', () => {
    render(<MemoryRouter><Button asChild variant="link"><Link to="/builds">See completed builds</Link></Button></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'See completed builds' })).toHaveAttribute('href', '/builds')
  })
  it('never uses transition-all', () => {
    render(<Button variant="quiet">Menu</Button>)
    expect(screen.getByRole('button').className).not.toContain('transition-all')
  })
})
