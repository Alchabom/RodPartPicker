import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Build, ComponentType } from '../types'
import { useChoose } from './useChoose'

let build: Build
const selectPart = vi.fn()
vi.mock('./useBuild', () => ({ useBuild: () => ({ build, basePath: '/builder', selectPart }) }))
// The catalog has every part except reel-999, which it has dropped
vi.mock('./useCatalog', () => ({ useCatalog: () => ({ getPart: (id?: string) => (id && id !== 'reel-999' ? { id } : undefined) }) }))

function Harness({ type, partId }: { type: ComponentType; partId: string }) {
  const choose = useChoose(type)
  return (
    <>
      <button onClick={() => choose(partId)}>Choose</button>
      <p data-testid="at">{useLocation().pathname}</p>
    </>
  )
}

beforeEach(() => selectPart.mockClear())

function choose(type: ComponentType, partId: string) {
  render(
    <MemoryRouter initialEntries={[`/builder/${type}`]}>
      <Harness type={type} partId={partId} />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Choose' }))
}

describe('useChoose', () => {
  it('adds the part and moves on to the next empty step', () => {
    build = { rod: 'rod-1' }
    choose('reel', 'reel-2')
    expect(selectPart).toHaveBeenCalledWith('reel', 'reel-2')
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/line')
  })

  it('does not skip a step whose part the catalog has dropped', () => {
    build = { reel: 'reel-999' }
    choose('rod', 'rod-1')
    expect(screen.getByTestId('at')).toHaveTextContent('/builder/reel')
  })

  it('lands on the summary once the last part is in', () => {
    build = { rod: 'rod-1', reel: 'reel-1', line: 'line-1', leader: 'leader-1' }
    choose('tippet', 'tippet-3')
    expect(screen.getByTestId('at')).toHaveTextContent(/^\/builder$/)
  })
})
