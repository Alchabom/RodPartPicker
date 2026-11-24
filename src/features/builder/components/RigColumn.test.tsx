import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Build } from '../types'
import { NO_FLAGS, type BuildFlags } from '../utils/flags'
import { RigColumn } from './RigColumn'

let build: Build
let flags: BuildFlags
const removePart = vi.fn()
vi.mock('../hooks/useBuild', () => ({ useBuild: () => ({ build, basePath: '/builder', removePart }) }))
const PARTS: Record<string, { id: string; brandId: string; name: string; price: number }> = {
  'rod-1': { id: 'rod-1', brandId: 'sage', name: 'R8 Core 590-4', price: 1100 },
  'reel-1': { id: 'reel-1', brandId: 'lamson', name: 'Liquid S', price: 159 },
}
const BRANDS: Record<string, { id: string; name: string }> = {
  sage: { id: 'sage', name: 'Sage' },
  lamson: { id: 'lamson', name: 'Lamson' },
}
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getPart: (id: string | undefined) => (id ? PARTS[id] : undefined),
    getBrand: (id: string | undefined) => (id ? BRANDS[id] : undefined),
  }),
}))
vi.mock('../hooks/useBuildCheck', () => ({ useBuildCheck: () => ({ flags, failed: false }) }))

function Where() {
  return <p data-testid="at">{useLocation().pathname}</p>
}

function renderColumn(current: 'rod' | 'reel' | 'line' = 'reel') {
  const utils = render(
    <MemoryRouter initialEntries={[`/builder/${current}`]}>
      <Routes>
        <Route path={`/builder/${current}`} element={<RigColumn current={current} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  return utils
}

// Large and small screens each have their own rig nav; the first is the column
const column = () => screen.getAllByRole('navigation', { name: 'Your rig' })[0]

beforeEach(() => {
  build = { rod: 'rod-1' }
  flags = NO_FLAGS
  removePart.mockReset()
})

describe('RigColumn', () => {
  it('lists the five parts, what is picked and the total', () => {
    build = { rod: 'rod-1', reel: 'reel-1' }
    renderColumn()
    const rows = within(column()).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Sage R8 Core 590-4'),
      expect.stringContaining('Lamson Liquid S'),
      expect.stringContaining('—'),
      expect.stringContaining('—'),
      expect.stringContaining('—'),
    ])
    expect(screen.getByRole('link', { name: /Review rig/ })).toHaveTextContent('$1,259.00')
  })

  it('shows only one Review rig once every other step is picked', () => {
    build = { rod: 'rod-1', reel: 'reel-1', line: 'reel-1', leader: 'reel-1', tippet: 'reel-1' }
    renderColumn('reel')
    expect(within(column()).getAllByText('Review rig')).toHaveLength(1)
    expect(within(column()).getByText('Total')).toBeInTheDocument()
  })

  it('marks the step you are on', () => {
    renderColumn('reel')
    expect(within(column()).getByRole('link', { name: /^Reel/ })).toHaveAttribute('aria-current', 'step')
    expect(within(column()).getByRole('link', { name: /^Rod/ })).not.toHaveAttribute('aria-current')
  })

  it('keeps the later steps closed until there is a rod', () => {
    build = {}
    renderColumn('rod')
    expect(within(column()).queryByRole('link', { name: /^Reel/ })).not.toBeInTheDocument()
    expect(within(column()).getAllByText(/pick a rod first/, { selector: '.sr-only' })).toHaveLength(4)
  })

  it('removes a part and moves focus to its step', async () => {
    build = { rod: 'rod-1', reel: 'reel-1' }
    renderColumn()
    await userEvent.click(within(column()).getByRole('button', { name: 'Remove reel' }))
    expect(removePart).toHaveBeenCalledWith('reel')
    expect(within(column()).getByRole('link', { name: /^Reel/ })).toHaveFocus()
  })

  it('offers Next once the step has a part, and goes there', async () => {
    build = { rod: 'rod-1', reel: 'reel-1' }
    renderColumn('reel')
    await userEvent.click(screen.getAllByRole('button', { name: 'Next: line' })[0])
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/line')
  })

  it('shows no Next until the step has a part', () => {
    renderColumn('reel')
    expect(screen.queryByRole('button', { name: /^Next|^Skip|Review rig/ })).not.toBeInTheDocument()
  })

  it('marks a part that no longer fits', () => {
    build = { rod: 'rod-1', reel: 'reel-1' }
    flags = { byPart: { reel: ['Too small'] }, buildWide: [] }
    renderColumn()
    expect(within(column()).getByText("(doesn't fit)")).toBeInTheDocument()
  })

  it('announces a new pick, but not on arrival', () => {
    const { rerender } = renderColumn('reel')
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('')

    build = { rod: 'rod-1', reel: 'reel-1' }
    act(() =>
      rerender(
        <MemoryRouter initialEntries={['/builder/reel']}>
          <Routes>
            <Route path="/builder/reel" element={<RigColumn current="reel" />} />
          </Routes>
        </MemoryRouter>,
      ),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Reel: Lamson Liquid S')
  })
})
