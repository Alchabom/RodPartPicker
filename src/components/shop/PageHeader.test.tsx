import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('puts the back link above the title, only when given', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PageHeader title="Smokies" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    rerender(
      <MemoryRouter>
        <PageHeader title="Smokies" back={{ to: '/rack', label: 'Community Rack' }} />
      </MemoryRouter>,
    )
    const back = screen.getByRole('link', { name: 'Community Rack' })
    expect(back).toHaveAttribute('href', '/rack')
    expect(back.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('runs onClick on a plain click and not on a Cmd-click', () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <PageHeader title="Smokies" back={{ to: '/rack', label: 'Community Rack', onClick }} />
      </MemoryRouter>,
    )
    const back = screen.getByRole('link', { name: 'Community Rack' })
    expect(fireEvent.click(back, { metaKey: true })).toBe(true)
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(back)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
