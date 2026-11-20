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
    render(<MemoryRouter><Button asChild variant="link"><Link to="/rack">See the Community Rack</Link></Button></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'See the Community Rack' })).toHaveAttribute('href', '/rack')
  })
  it('never uses transition-all', () => {
    render(<Button variant="quiet">Menu</Button>)
    expect(screen.getByRole('button').className).not.toContain('transition-all')
  })
  it('adds the fin-edge left padding to primary buttons, not icon ones', () => {
    render(<><Button>Add</Button><Button size="icon" aria-label="Icon">x</Button></>)
    expect(screen.getByRole('button', { name: 'Add' }).className).toContain('pl-[calc(--spacing(3.5)+6px)]')
    expect(screen.getByRole('button', { name: 'Icon' }).className).not.toContain('+6px')
  })
  it('shows a full-opacity, offset focus ring', () => {
    render(<Button>Focus</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('focus-visible:ring-ring')
    expect(cls).toContain('focus-visible:ring-offset-2')
    expect(cls).not.toContain('ring-ring/50')
  })
})
