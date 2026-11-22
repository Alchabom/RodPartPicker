import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RigBridge, RigSteps } from './RigSteps'

const renderSteps = () =>
  render(
    <MemoryRouter>
      <RigSteps />
    </MemoryRouter>,
  )

const items = () => within(screen.getByRole('list', { name: 'How a rig goes together' })).getAllByRole('listitem')

describe('RigSteps', () => {
  it('lists the five steps in order on one line', () => {
    renderSteps()
    expect(items().map((li) => li.querySelector('h3')?.textContent)).toEqual(['Rod', 'Reel', 'Line', 'Leader', 'Tippet'])
  })

  it('tapers the line 4, 4, 3, 2, 1 px', () => {
    renderSteps()
    const segments = items().map((li) => li.querySelector<HTMLElement>('[data-segment]')!)
    expect(segments.map((s) => s.style.width)).toEqual(['4px', '4px', '3px', '2px', '1px'])
    for (const s of segments) {
      expect(s).toHaveClass('rig-draw')
      expect(s).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('marks each step with a guide ring, not a number', () => {
    const { container } = renderSteps()
    const markers = container.querySelectorAll('[data-marker]')
    expect(markers).toHaveLength(5)
    for (const m of markers) expect(m).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText('1')).toBeNull()
  })

  it('rises each step in as the line reaches it', () => {
    renderSteps()
    for (const li of items()) expect(li.querySelector('h3')!.parentElement).toHaveClass('rig-rise')
  })

  it('ends the line in a hook and a Start a build link', () => {
    renderSteps()
    expect(screen.getByTestId('hook')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a build' })).toHaveAttribute('href', '/builder')
  })

  it('draws the bridge only from lg, hidden from assistive tech', () => {
    const { container } = render(<RigBridge />)
    const root = container.firstElementChild!
    expect(root).toHaveClass('hidden')
    expect(root).toHaveClass('lg:block')
    expect(root).toHaveAttribute('aria-hidden', 'true')
    const path = root.querySelector('path')!
    expect(path).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(path).toHaveAttribute('pathLength', '1')
    expect(path).toHaveClass('rig-bridge')
  })
})
