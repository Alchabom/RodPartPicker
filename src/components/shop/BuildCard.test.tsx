import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import type { PublishedSummary } from '@/lib/published'
import { BuildCard } from './BuildCard'

const build: PublishedSummary = {
  id: 5,
  title: 'Smokies 4wt '.repeat(10).trim(),
  author: 'Ridge Runner',
  rod: { brand: 'Redington', name: 'Classic Trout 486-4', lineWeight: 4, imageUrl: null },
  totalPrice: 417.99,
  publishedAt: '2026-11-18T14:00:00Z',
}

describe('BuildCard', () => {
  it('links to the build and shows its details', () => {
    render(<MemoryRouter><ul><BuildCard build={build} /></ul></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/builds/5')
    expect(screen.getByText(build.title)).toHaveClass('line-clamp-2')
    expect(screen.getByText('Redington Classic Trout 486-4 · 4 wt')).toBeInTheDocument()
    expect(screen.getByText('$417.99')).toBeInTheDocument()
  })
  it('handles a deleted rod', () => {
    render(<MemoryRouter><ul><BuildCard build={{ ...build, rod: null }} /></ul></MemoryRouter>)
    expect(screen.getByText('Rod no longer available')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rod' })).toBeInTheDocument()
  })
})
