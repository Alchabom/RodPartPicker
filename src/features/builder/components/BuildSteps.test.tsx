import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Build } from '../types'
import { NO_FLAGS, type BuildFlags } from '../utils/flags'
import { BuildSteps } from './BuildSteps'

let build: Build
let basePath: string
let flags: BuildFlags
vi.mock('../hooks/useBuild', () => ({ useBuild: () => ({ build, basePath }) }))
vi.mock('../hooks/useCatalog', () => ({
  // Every id is in the catalog except reel-999, which it has dropped
  useCatalog: () => ({ getPart: (id: string | undefined) => (id && id !== 'reel-999' ? { id } : undefined) }),
}))
vi.mock('../hooks/useBuildCheck', () => ({ useBuildCheck: () => ({ flags, failed: false }) }))

beforeEach(() => {
  build = {}
  basePath = '/builder'
  flags = NO_FLAGS
})

const item = (label: string) => screen.getByText(label).closest('li')!

function renderSteps(current: Parameters<typeof BuildSteps>[0]['current'] = 'rod') {
  render(
    <MemoryRouter>
      <BuildSteps current={current} />
    </MemoryRouter>,
  )
}

describe('BuildSteps', () => {
  it('marks picked, empty and flagged parts', () => {
    build = { rod: 'rod-1', reel: 'reel-1' }
    flags = { byPart: { reel: ['too light'] }, buildWide: [] }
    renderSteps()
    expect(item('Rod')).toHaveAttribute('data-state', 'picked')
    expect(item('Reel')).toHaveAttribute('data-state', 'flagged')
    expect(item('Line')).toHaveAttribute('data-state', 'empty')
  })

  it('points the current step', () => {
    build = { rod: 'rod-1' }
    renderSteps('line')
    expect(screen.getByRole('link', { name: 'Line' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link', { name: 'Rod' })).not.toHaveAttribute('aria-current')
  })

  it('locks every step but the rod until a rod is picked', () => {
    renderSteps()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Rod' })).toBeInTheDocument()
    expect(screen.getByText('Reel').closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
  })

  it('links each step under the build path', () => {
    build = { rod: 'rod-1' }
    basePath = '/builder/42'
    renderSteps()
    expect(screen.getByRole('link', { name: 'Reel' })).toHaveAttribute('href', '/builder/42/reel')
  })

  it('treats a part the catalog no longer has as empty', () => {
    build = { rod: 'rod-1', reel: 'reel-999' }
    renderSteps()
    expect(item('Reel')).toHaveAttribute('data-state', 'empty')
  })
})
