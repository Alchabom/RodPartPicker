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
})
