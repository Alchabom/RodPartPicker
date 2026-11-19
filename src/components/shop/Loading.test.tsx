import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BuildCardSkeleton } from './BuildCardSkeleton'
import { Loading } from './Loading'
import { PageSkeleton } from './PageSkeleton'

describe('Loading', () => {
  it('announces its label and hides the placeholder shapes', () => {
    render(
      <Loading label="Loading parts">
        <div data-testid="shape" />
      </Loading>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading parts')
    expect(screen.getByTestId('shape').parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('skeleton shapes', () => {
  it('pulses only when motion is allowed', () => {
    const { container } = render(<BuildCardSkeleton />)
    const shapes = container.querySelectorAll('[data-slot="skeleton"]')
    expect(shapes.length).toBeGreaterThan(0)
    for (const shape of shapes) {
      expect(shape.className).toContain('motion-safe:animate-pulse')
      expect(shape.className).not.toMatch(/(^|\s)animate-pulse/)
    }
  })

  it('gives a page skeleton a status label', () => {
    render(<PageSkeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
})
