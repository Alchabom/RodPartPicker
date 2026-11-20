import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RidgeScene } from './RidgeScene'

const drawPath = (container: HTMLElement) => container.querySelector('mask path') as SVGPathElement

describe('RidgeScene', () => {
  it('hides the cast below lg, where the crop would cut it', () => {
    render(<RidgeScene />)
    const cast = screen.getByTestId('cast')
    expect(cast).toHaveClass('hidden')
    expect(cast).toHaveClass('lg:block')
  })

  it('draws the cast in only when asked, and only with motion allowed', () => {
    const { container, rerender } = render(<RidgeScene drawCast />)
    expect(drawPath(container).getAttribute('class')).toBe('motion-safe:animate-cast')
    rerender(<RidgeScene />)
    expect(drawPath(container).getAttribute('class') ?? '').not.toContain('animate-cast')
  })

  it('hides the rod and its guides below lg too', () => {
    render(<RidgeScene />)
    for (const id of ['rod', 'guides']) {
      expect(screen.getByTestId(id)).toHaveClass('hidden')
      expect(screen.getByTestId(id)).toHaveClass('lg:block')
    }
  })

  it('draws five guides on the rod, each a ring on two legs', () => {
    render(<RidgeScene />)
    const guides = screen.getByTestId('guides')
    expect(guides.querySelectorAll('circle')).toHaveLength(5)
    expect(guides.querySelectorAll('path')).toHaveLength(10)
  })

  it('draws the rod and guides at once, and only the line in', () => {
    const { container } = render(<RidgeScene drawCast />)
    expect(screen.getByTestId('cast')).toHaveAttribute('mask')
    expect(screen.getByTestId('rod')).not.toHaveAttribute('mask')
    expect(screen.getByTestId('guides')).not.toHaveAttribute('mask')
    expect(drawPath(container).getAttribute('d')).toMatch(/^M607\.76 360\.89 /)
  })
})
