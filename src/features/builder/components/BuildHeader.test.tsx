import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { BuildHeader } from './BuildHeader'

let value: Record<string, unknown>
vi.mock('../hooks/useBuild', () => ({ useBuild: () => value }))

function renderHeader() {
  return render(
    <MemoryRouter>
      <BuildHeader />
    </MemoryRouter>,
  )
}

describe('BuildHeader', () => {
  it('links a saved build back to My builds', () => {
    value = { kind: 'saved', name: 'Smokies', saveStatus: 'saved', rename: vi.fn(), retrySave: vi.fn() }
    renderHeader()
    expect(screen.getByRole('link', { name: 'My builds' })).toHaveAttribute('href', '/my-builds')
    expect(screen.getByRole('textbox', { name: 'Build name' })).toHaveValue('Smokies')
  })

  it('shows nothing for a draft', () => {
    value = { kind: 'draft' }
    const { container } = renderHeader()
    expect(container).toBeEmptyDOMElement()
  })
})
