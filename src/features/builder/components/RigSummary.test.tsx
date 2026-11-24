import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Build, BuildNotes, ComponentType, Part } from '../types'
import { NO_FLAGS, type BuildFlags } from '../utils/flags'
import { RigSummary } from './RigSummary'

function part(component: ComponentType, name: string, specs: Record<string, string>, price = 100): Part {
  return { id: `${component}-1`, dbId: 1, component, brandId: 'rio', name, price, purchaseUrl: null, imageUrl: null, specs }
}
const PARTS = [
  part('rod', 'R8 Core 590-4', { Length: `9'0"`, 'Line Wt': '5 wt' }, 1100),
  part('reel', 'Guru X', { 'Line Wt': '4–6 wt', Water: 'fresh' }),
  part('line', 'Elite Gold', { 'Line Wt': '5 wt', Type: 'Floating' }),
  part('leader', 'Powerflex', { Length: "9'", 'X-Size': '4X' }, 6),
  part('tippet', 'Powerflex Tippet', { 'X-Size': '5X', Material: 'Nylon' }, 5),
]
const FULL: Build = Object.fromEntries(PARTS.map((p) => [p.component, p.id]))

let build: Build
let notes: BuildNotes
let kind: 'draft' | 'saved'
let flags: BuildFlags
let failed: boolean
const clearBuild = vi.fn()
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({
    build,
    notes,
    basePath: '/builder',
    clearBuild,
    kind,
    ...(kind === 'saved' ? { id: 42, name: 'Smokies', saveStatus: 'saved', rename: vi.fn(), retrySave: vi.fn() } : {}),
  }),
}))
vi.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    getBrand: () => ({ id: 'rio', name: 'RIO' }),
    getPart: (id: string | undefined) => PARTS.find((p) => p.id === id),
  }),
}))
vi.mock('../hooks/useBuildCheck', () => ({ useBuildCheck: () => ({ flags, failed }) }))
vi.mock('./CopyPublishedIntent', () => ({ CopyPublishedIntent: () => null }))
vi.mock('./SaveDraftButton', () => ({ SaveDraftButton: () => <button>Save this rig</button> }))
vi.mock('./PublishControls', () => ({ PublishControls: () => <button>Post to the Rack</button> }))

function Where() {
  return <p data-testid="at">{useLocation().pathname}</p>
}

function renderSummary() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/builder']}>
        <Routes>
          <Route path="/builder" element={<RigSummary />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  build = FULL
  notes = {}
  kind = 'draft'
  flags = NO_FLAGS
  failed = false
  clearBuild.mockClear()
})

describe('RigSummary', () => {
  it('celebrates a complete rig', () => {
    renderSummary()
    expect(screen.getByRole('heading', { level: 1, name: 'Your rig is ready' })).toBeInTheDocument()
    expect(screen.getByText('Five parts, matched to your 5 wt RIO R8 Core 590-4.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Your rig' })).getAllByRole('link', { name: /^Change/ })).toHaveLength(5)
    expect(screen.getByText('$1,311.00')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Continue/ })).toBeNull()
  })

  it('ends the line in a hook, hidden from assistive tech', () => {
    renderSummary()
    expect(screen.getByTestId('rig-hook').querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('counts an incomplete rig and points to the next part', () => {
    build = { rod: FULL.rod, reel: FULL.reel }
    renderSummary()
    expect(screen.getByRole('heading', { level: 1, name: '2 of 5 picked' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue: choose a line' })).toHaveAttribute('href', '/builder/line')
    expect(screen.getByRole('link', { name: 'Choose a leader' })).toHaveAttribute('href', '/builder/leader')
  })

  it('treats a part missing from the catalog as empty', () => {
    build = { ...FULL, tippet: 'tippet-999' }
    renderSummary()
    expect(screen.getByRole('heading', { level: 1, name: '4 of 5 picked' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue: choose a tippet' })).toBeInTheDocument()
  })

  it('flags a part that no longer fits and links to its step', () => {
    flags = { byPart: { reel: ['Guru X is rated for 4-6 wt, but your rod is 8 wt.'] }, buildWide: [] }
    renderSummary()
    expect(screen.getByRole('heading', { level: 1, name: 'Almost there' })).toBeInTheDocument()
    expect(within(screen.getByRole('alert')).getByText(/rated for 4-6 wt/)).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Your rig' })).getByText(/rated for 4-6 wt/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find a reel that fits' })).toHaveAttribute('href', '/builder/reel')
  })

  it('ties a wind knot in the line at a flagged part, and counts the knots', () => {
    flags = { byPart: { reel: ['too light'], line: ['wrong weight'] }, buildWide: ['mixed water'] }
    renderSummary()
    expect(within(screen.getByRole('alert')).getByText('3 knots to untie:')).toBeInTheDocument()
    expect(screen.getAllByTestId('knot')).toHaveLength(2)
    expect(screen.getAllByTestId('knot')[0].closest('li')).toHaveTextContent('Reel')
    expect(screen.getAllByTestId('knot')[0].querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('says one knot for one problem', () => {
    flags = { byPart: { tippet: ['wrong size'] }, buildWide: [] }
    renderSummary()
    expect(screen.getByText('One knot to untie:')).toBeInTheDocument()
  })

  it('shows build-wide warnings only in the banner', () => {
    flags = { byPart: {}, buildWide: ['This build mixes freshwater and saltwater parts.'] }
    renderSummary()
    expect(screen.getByRole('heading', { level: 1, name: 'Almost there' })).toBeInTheDocument()
    expect(screen.getAllByText('This build mixes freshwater and saltwater parts.')).toHaveLength(1)
    expect(screen.queryByRole('link', { name: /that fits/ })).toBeNull()
  })

  it('offers Save this rig on a draft and the Rack controls on a saved build', () => {
    renderSummary()
    expect(screen.getByRole('button', { name: 'Save this rig' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post to the Rack' })).toBeNull()
  })

  it('shows the name and the Rack controls on a saved build', () => {
    kind = 'saved'
    renderSummary()
    expect(screen.getByRole('textbox', { name: 'Build name' })).toHaveValue('Smokies')
    expect(screen.getByRole('button', { name: 'Post to the Rack' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save this rig' })).toBeNull()
  })

  it('offers a Buy button beside each part with a shop link, like the Rack', () => {
    PARTS[0].purchaseUrl = 'https://shop.example/rod'
    try {
      renderSummary()
      const buy = screen.getByRole('link', { name: `Buy RIO ${PARTS[0].name}` })
      expect(buy).toHaveAttribute('href', 'https://shop.example/rod')
      expect(buy).toHaveTextContent(/^Buy$/)
      expect(buy).toHaveAttribute('target', '_blank')
      // A real button, the same one the Rack's build page uses
      expect(buy).toHaveAttribute('data-slot', 'button')
      // The price is plain text now, not the link
      expect(screen.getAllByRole('link', { name: /Buy/ })).toHaveLength(1)
    } finally {
      PARTS[0].purchaseUrl = null
    }
  })

  it('starts over at the rod step', () => {
    renderSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(clearBuild).toHaveBeenCalled()
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/rod')
  })

  it('says so when the rig check fails', () => {
    failed = true
    renderSummary()
    expect(screen.getByText("Couldn't check the rig")).toBeInTheDocument()
  })

  it('shows the questionnaire note in place of the spec line', () => {
    notes = { reel: 'Light and simple for a first rod.' }
    renderSummary()
    expect(screen.getByText('Light and simple for a first rod.')).toBeInTheDocument()
    expect(screen.queryByText('4–6 wt · fresh')).toBeNull()
    expect(screen.getByText('5 wt · Floating')).toBeInTheDocument()
  })
})
