import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareButton } from './ShareButton'

const URL_7 = window.location.origin + '/rack/7'

function mockShare(result: () => Promise<void> = () => Promise.resolve()) {
  const share = vi.fn(result)
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  return share
}

function mockClipboard(result: () => Promise<void> = () => Promise.resolve()) {
  const writeText = vi.fn(result)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

function coarse(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches }))
}

function setup() {
  // userEvent.setup() installs its own navigator.clipboard stub, so tests call
  // setup() before mockClipboard(). advanceTimers keeps it in step with fake timers.
  const user = userEvent.setup({
    advanceTimers: (ms) => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(ms)
    },
  })
  const utils = render(<ShareButton path="/rack/7" title="Creek" />)
  return { user, ...utils }
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

async function click(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /share|link copied/i }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const key of ['share', 'canShare', 'clipboard']) {
    Reflect.deleteProperty(navigator, key)
  }
})

describe('ShareButton', () => {
  it('opens the share sheet on a touch device', async () => {
    const { user } = setup()
    const share = mockShare()
    coarse(true)
    await click(user)
    expect(share).toHaveBeenCalledWith({ title: 'Creek', url: URL_7 })
  })

  it('does nothing when the sheet is closed', async () => {
    const { user } = setup()
    mockShare(() => Promise.reject(new DOMException('', 'AbortError')))
    coarse(true)
    const writeText = mockClipboard()
    await click(user)
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Copy this link')).toBeNull()
  })

  it('copies on a desktop and says so for 2 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = setup()
    const writeText = mockClipboard()
    coarse(false)
    await click(user)
    expect(writeText).toHaveBeenCalledWith(URL_7)
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
    expect(screen.getByRole('button')).toHaveTextContent('Link copied')
    await advance(2000)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('button')).toHaveTextContent('Share')
  })

  it('restarts the timer on a second click', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = setup()
    mockClipboard()
    coarse(false)
    await click(user)
    await advance(1500)
    await click(user)
    await advance(1500)
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
    await advance(500)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('clears its timer on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user, unmount } = setup()
    mockClipboard()
    coarse(false)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await click(user)
    unmount()
    await advance(2000)
    expect(error).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows the link to copy by hand when copying fails', async () => {
    const { user } = setup()
    mockClipboard(() => Promise.reject(new Error('denied')))
    coarse(false)
    await click(user)
    expect(await screen.findByRole('textbox', { name: 'Link' })).toHaveValue(URL_7)
    expect(screen.getByText('Copy this link')).toBeInTheDocument()
  })

  it('shows the link to copy by hand when there is no clipboard', async () => {
    // fireEvent, because userEvent re-installs its own clipboard stub on every call
    render(<ShareButton path="/rack/7" title="Creek" />)
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    coarse(false)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('textbox', { name: 'Link' })).toHaveValue(URL_7)
  })
})
