import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FitSpot } from './FitSpot'

describe('FitSpot', () => {
  it('is labeled for assistive tech by default', () => {
    render(<FitSpot />)
    expect(screen.getByRole('img', { name: 'Fits your build' })).toBeInTheDocument()
  })
  it('is hidden when decorative', () => {
    const { container } = render(<FitSpot decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
