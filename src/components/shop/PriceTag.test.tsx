import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PriceTag } from './PriceTag'

describe('PriceTag', () => {
  it('formats and uses tabular figures', () => {
    render(<PriceTag price={199.99} />)
    expect(screen.getByText('$199.99')).toHaveClass('tabular-nums')
  })
  it('shows a dash for no price', () => {
    render(<PriceTag price={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
