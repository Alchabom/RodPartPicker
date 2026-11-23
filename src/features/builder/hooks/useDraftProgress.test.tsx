import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBuild } from './useBuild'
import { useDraftProgress } from './useDraftProgress'
import { LocalBuildProvider } from './LocalBuildProvider'

function Count() {
  return <p data-testid="picked">{useDraftProgress().picked}</p>
}

const store = (draft: unknown) => localStorage.setItem('rpp:build:v2', typeof draft === 'string' ? draft : JSON.stringify(draft))

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('useDraftProgress', () => {
  it('is 0 with no draft and with a malformed one', () => {
    const { unmount } = render(<Count />)
    expect(screen.getByTestId('picked')).toHaveTextContent('0')
    unmount()
    store('{not json')
    render(<Count />)
    expect(screen.getByTestId('picked')).toHaveTextContent('0')
  })

  it('counts only the five parts', () => {
    store({ rod: 'rod-1', reel: 'reel-2', junk: 'x', line: 5, leader: '', tippet: 'reel-9' })
    render(<Count />)
    // tippet: 'reel-9' isn't a tippet id, so the builder wouldn't load it either
    expect(screen.getByTestId('picked')).toHaveTextContent('2')
  })

  it('updates when the draft changes in this tab', () => {
    render(<Count />)
    store({ rod: 'rod-1' })
    act(() => {
      window.dispatchEvent(new Event('rpp:draft-change'))
    })
    expect(screen.getByTestId('picked')).toHaveTextContent('1')
  })

  it('updates when another tab changes the draft', () => {
    render(<Count />)
    store({ rod: 'rod-1', reel: 'reel-1', line: 'line-1' })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'rpp:build:v2' }))
    })
    expect(screen.getByTestId('picked')).toHaveTextContent('3')
  })

  it('is 0 when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    render(<Count />)
    expect(screen.getByTestId('picked')).toHaveTextContent('0')
  })
})

describe('LocalBuildProvider', () => {
  function Actions() {
    const { selectPart, clearBuild } = useBuild()
    return (
      <>
        <button onClick={() => selectPart('rod', 'rod-1')}>Pick</button>
        <button onClick={clearBuild}>Clear</button>
        <Count />
      </>
    )
  }

  it('follows a draft another tab changed', () => {
    function Shown() {
      return <p data-testid="rod">{useBuild().build.rod ?? 'none'}</p>
    }
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<LocalBuildProvider />}>
            <Route index element={<Shown />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('rod')).toHaveTextContent('none')
    store({ rod: 'rod-7' })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'rpp:build:v2' }))
    })
    expect(screen.getByTestId('rod')).toHaveTextContent('rod-7')
  })

  it('announces every draft write, so the count follows picks and clears', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<LocalBuildProvider />}>
            <Route index element={<Actions />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    act(() => screen.getByRole('button', { name: 'Pick' }).click())
    expect(screen.getByTestId('picked')).toHaveTextContent('1')
    act(() => screen.getByRole('button', { name: 'Clear' }).click())
    expect(screen.getByTestId('picked')).toHaveTextContent('0')
  })
})
