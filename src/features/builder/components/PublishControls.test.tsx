import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { buildKeys } from '../api/builds'
import { getMyPublished, publishBuild, unpublishBuild } from '../api/publish'
import type { Build } from '../types'
import { PublishControls } from './PublishControls'
import { PublishDialog } from './PublishDialog'

vi.mock('../api/publish')
vi.mock('../hooks/useBuild', () => ({
  useBuild: () => ({ kind: 'saved', flushSave: vi.fn().mockResolvedValue(undefined) }),
}))

const full: Build = { rod: 'rod-1', reel: 'reel-1', line: 'line-1', leader: 'leader-1', tippet: 'tippet-1' }
const ref = { id: 9, title: 'Creek', writeup: 'x', updatedAt: '2026-01-01T00:00:00Z' }

function setup(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { invalidate }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('PublishControls', () => {
  it('offers Post to the Rack for a complete unposted build', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(null)
    setup(<PublishControls id={1} name="Mine" build={full} />)
    expect(await screen.findByRole('button', { name: 'Post to the Rack' })).toBeEnabled()
  })

  it('disables posting and hints when a part is missing', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(null)
    setup(<PublishControls id={1} name="Mine" build={{ rod: 'rod-1' }} />)
    expect(await screen.findByRole('button', { name: 'Post to the Rack' })).toBeDisabled()
    expect(screen.getByText('Add all five parts to post')).toBeInTheDocument()
  })

  it('shows the Rack link and update/take-off buttons when posted', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(ref)
    setup(<PublishControls id={1} name="Mine" build={full} />)
    const link = await screen.findByRole('link', { name: 'On the Community Rack · View' })
    expect(link).toHaveAttribute('href', '/rack/9')
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update on the Rack' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take off the Rack' })).toBeInTheDocument()
  })

  it('invalidates the builds list after taking a build off the Rack', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(ref)
    vi.mocked(unpublishBuild).mockResolvedValue(undefined)
    const { invalidate } = setup(<PublishControls id={1} name="Mine" build={full} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Take off the Rack' }))
    expect(await screen.findByText('Take "Creek" off the Rack?')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Take off the Rack' })
    await userEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: buildKeys.list() }))
  })
})

describe('PublishControls notice', () => {
  it('says "Posted to the Rack" after a successful post', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(null)
    vi.mocked(publishBuild).mockResolvedValue(ref)
    setup(<PublishControls id={1} name="Mine" build={full} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Post to the Rack' }))
    await userEvent.type(await screen.findByLabelText('Write-up'), 'Light and quick')
    const buttons = await screen.findAllByRole('button', { name: 'Post to the Rack' })
    await userEvent.click(buttons[buttons.length - 1])
    expect(await screen.findByText('Posted to the Rack')).toHaveAttribute('role', 'status')
  })

  it('says "Updated on the Rack" after a successful update', async () => {
    vi.mocked(getMyPublished).mockResolvedValue(ref)
    vi.mocked(publishBuild).mockResolvedValue(ref)
    setup(<PublishControls id={1} name="Mine" build={full} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Update on the Rack' }))
    const buttons = await screen.findAllByRole('button', { name: 'Update on the Rack' })
    await userEvent.click(buttons[buttons.length - 1])
    expect(await screen.findByText('Updated on the Rack')).toHaveAttribute('role', 'status')
  })
})

describe('PublishDialog wording', () => {
  const props = { onOpenChange: vi.fn(), buildId: 1, initial: { title: 'Creek', writeup: 'x' }, onSaved: vi.fn() }

  it('first post wording', () => {
    setup(<PublishDialog {...props} open mode="publish" />)
    expect(screen.getByText('Post to the Community Rack')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Anyone can see this build on the Community Rack, including people who aren't signed in. It shows your display name, these parts, the title and write-up.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Post to the Rack' })).toBeInTheDocument()
  })

  it('update wording', () => {
    setup(<PublishDialog {...props} open mode="update" />)
    expect(screen.getByRole('heading', { name: 'Update on the Rack' })).toBeInTheDocument()
    expect(
      screen.getByText('The Rack copy gets your current parts, title and write-up. Later edits stay private until you update again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update on the Rack' })).toBeInTheDocument()
  })

  it('shows Rack wording for a 409', async () => {
    vi.mocked(publishBuild).mockRejectedValue(new ApiError(409, { detail: 'Already published' }, new Headers()))
    setup(<PublishDialog {...props} open mode="publish" />)
    await userEvent.click(screen.getByRole('button', { name: 'Post to the Rack' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Already on the Rack')
  })

  it('invalidates the builds list on success', async () => {
    vi.mocked(publishBuild).mockResolvedValue(ref)
    const { invalidate } = setup(<PublishDialog {...props} open mode="publish" />)
    await userEvent.click(screen.getByRole('button', { name: 'Post to the Rack' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: buildKeys.list() }))
  })
})
