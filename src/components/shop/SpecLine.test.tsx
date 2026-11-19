import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SpecLine } from './SpecLine'

describe('SpecLine', () => {
  it('joins present specs with a middle dot', () => {
    render(<SpecLine specs={['8′6″', '4 wt', null, 'Medium', '', '4 pc']} />)
    expect(screen.getByText('8′6″ · 4 wt · Medium · 4 pc')).toBeInTheDocument()
  })
  it('renders nothing when every spec is empty', () => {
    const { container } = render(<SpecLine specs={[null, '']} />)
    expect(container).toBeEmptyDOMElement()
  })
})
