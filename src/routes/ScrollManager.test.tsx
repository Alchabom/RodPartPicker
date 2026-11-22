import { useEffect } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollManager } from './ScrollManager'

let navigate: NavigateFunction
function Grab() {
  const nav = useNavigate()
  useEffect(() => {
    navigate = nav
  })
  return null
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true })
  fireEvent.scroll(window)
}

let scrollTo: ReturnType<typeof vi.fn>

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/a']}>
      <ScrollManager />
      <Grab />
      <Routes>
        <Route path="/a" element={<p>A</p>} />
        <Route path="/b" element={<div id="steps">B</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  setScrollY(0)
  renderApp()
  scrollTo.mockClear()
})

afterEach(() => {
  // jsdom has no scrollIntoView; drop the stub one test adds
  delete (Element.prototype as Partial<Element>).scrollIntoView
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ScrollManager', () => {
  it('scrolls to the top on a new page', () => {
    setScrollY(300)
    act(() => {
      navigate('/b')
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('scrolls to the anchor on a hash link', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    act(() => {
      navigate('/b')
    })
    scrollTo.mockClear()
    act(() => {
      navigate('/b#steps')
    })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to the top when the hash has no matching element', () => {
    act(() => {
      navigate('/b#nope')
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('does not scroll on a same-path replace', () => {
    act(() => {
      navigate('/a?copy=1')
    })
    scrollTo.mockClear()
    act(() => {
      navigate('/a', { replace: true })
    })
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to the top on a redirect to a new path', () => {
    act(() => {
      navigate('/b', { replace: true })
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('restores the position on Back', () => {
    setScrollY(640)
    act(() => {
      navigate('/b')
    })
    setScrollY(0)
    act(() => {
      navigate(-1)
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640)
  })

  it('leaves a first load with nothing saved where the browser put it', () => {
    cleanup()
    scrollTo.mockClear()
    renderApp()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('restores the position after a reload', () => {
    setScrollY(640)
    fireEvent(window, new Event('pagehide'))
    cleanup()
    setScrollY(0)
    scrollTo.mockClear()
    renderApp() // the same first entry, so the same key
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640)
  })

  it('keeps the saved position when a short page clamps the restore', () => {
    setScrollY(640)
    act(() => {
      navigate('/b')
    })
    setScrollY(0)
    act(() => {
      navigate(-1)
    })
    setScrollY(600) // the page was too short to reach 640
    act(() => {
      navigate(1)
    })
    act(() => {
      navigate(-1)
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640)
  })

  it('survives a malformed hash', () => {
    act(() => {
      navigate('/b#%E0')
    })
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })
})
