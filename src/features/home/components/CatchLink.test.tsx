import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CATCH_MS, CatchLink } from './CatchLink'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

let reduce = false

beforeEach(() => {
  reduce = false
  navigate.mockClear()
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce') }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderCatch() {
  const result = render(
    <MemoryRouter>
      <CatchLink />
    </MemoryRouter>,
  )
  return { ...result, link: screen.getByRole('link', { name: 'Start a build' }), root: result.container.firstElementChild! }
}

describe('CatchLink', () => {
  it('plays the catch, then opens the builder at 450 ms', () => {
    const { link, root } = renderCatch()
    expect(CATCH_MS).toBe(450)
    expect(fireEvent.click(link)).toBe(false)
    expect(root).toHaveAttribute('data-catching', 'true')
    vi.advanceTimersByTime(449)
    expect(navigate).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/builder')
  })

  it('navigates once on a double click', () => {
    const { link } = renderCatch()
    fireEvent.click(link)
    fireEvent.click(link)
    vi.advanceTimersByTime(CATCH_MS)
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('skips the catch with reduced motion: the link opens the builder at once', () => {
    reduce = true
    render(
      <MemoryRouter>
        <Routes>
          <Route index element={<CatchLink />} />
          <Route path="builder" element={<p>Builder</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Start a build' }))
    // The Link navigated itself, with no timer and no catch
    expect(screen.getByText('Builder')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('leaves modifier clicks to the browser', () => {
    const { link, root } = renderCatch()
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { button: 1 }]) {
      expect(fireEvent.click(link, init)).toBe(true)
      expect(root).not.toHaveAttribute('data-catching')
    }
  })

  it('cancels the navigation if unmounted mid-catch', () => {
    const { link, unmount } = renderCatch()
    fireEvent.click(link)
    unmount()
    vi.advanceTimersByTime(CATCH_MS)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('hooks the button itself: no fish, and the hook is hidden from assistive tech', () => {
    const { link } = renderCatch()
    expect(screen.getByTestId('hook')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByTestId('fish')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(link).toHaveAttribute('href', '/builder')
    // The button rises on the catch, only with motion allowed
    expect(link.parentElement).toHaveClass('in-data-[catching=true]:motion-safe:animate-catch-raise')
  })
})
