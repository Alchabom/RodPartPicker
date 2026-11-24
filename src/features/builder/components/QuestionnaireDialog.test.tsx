import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionnaireDialog } from './QuestionnaireDialog'

const getRecommendation = vi.fn()
vi.mock('../api/questionnaire', () => ({
  getRecommendation: (...args: unknown[]) => getRecommendation(...args),
}))

const loadRecommendation = vi.fn()
vi.mock('../hooks/useBuild', () => ({ useBuild: () => ({ loadRecommendation }) }))

function renderDialog() {
  const onOpenChange = vi.fn()
  render(<QuestionnaireDialog open onOpenChange={onOpenChange} />)
  return { user: userEvent.setup(), onOpenChange }
}

async function pick(user: ReturnType<typeof userEvent.setup>, ...labels: string[]) {
  for (const label of labels) await user.click(await screen.findByRole('button', { name: new RegExp(`^${label}`) }))
}

beforeEach(() => {
  getRecommendation.mockReset().mockResolvedValue([])
  loadRecommendation.mockReset()
})

describe('QuestionnaireDialog', () => {
  it('asks large rivers anglers what they target, then that target’s flies', async () => {
    const { user } = renderDialog()
    await pick(user, 'Medium', 'Large rivers')

    expect(screen.getByText('What are you targeting?')).toBeInTheDocument()
    expect(screen.getByText('3 of 5')).toBeInTheDocument()

    await pick(user, 'Smallmouth bass')
    expect(screen.getByText('What will you mostly be throwing?')).toBeInTheDocument()
    const options = screen.getAllByRole('button').map((b) => b.textContent)
    expect(options).toContain('Small to medium streamers')
    expect(options).toContain('Large streamers and heavy topwater')
    expect(options).not.toContain('Dries and nymphs')
  })

  it('shows each target its own flies', async () => {
    const { user } = renderDialog()
    await pick(user, 'Low', 'Large rivers', 'Musky and other large predators')

    for (const label of ['Unweighted streamers', 'Heavily weighted streamers', 'Some of both']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('sends the river answers and loads the setup', async () => {
    const { user, onOpenChange } = renderDialog()
    await pick(user, 'High', 'Large rivers', 'Trout', 'Large streamers', 'Medium')

    expect(getRecommendation).toHaveBeenCalledWith(
      { experience: 'high', place: 'large_rivers', target: 'trout', flies: 'large_streamers', budget: 'medium' },
      expect.any(AbortSignal),
    )
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(loadRecommendation).toHaveBeenCalled()
  })

  it('drops the flies answer when the target changes', async () => {
    const { user } = renderDialog()
    await pick(user, 'High', 'Large rivers', 'Trout', 'Dries and nymphs')
    await user.click(screen.getByRole('button', { name: /Back/ }))
    await user.click(screen.getByRole('button', { name: /Back/ }))
    await pick(user, 'Musky and other large predators', 'Some of both', 'Low')

    expect(getRecommendation).toHaveBeenCalledWith(
      { experience: 'high', place: 'large_rivers', target: 'predators', flies: 'both', budget: 'low' },
      expect.any(AbortSignal),
    )
  })

  it('still asks small creeks anglers about trout and other water', async () => {
    const { user } = renderDialog()
    await pick(user, 'Low', 'Small creeks', 'Yes', 'No', 'Low')

    expect(getRecommendation).toHaveBeenCalledWith(
      { experience: 'low', place: 'small_creeks', trout: true, onlyRod: false, budget: 'low' },
      expect.any(AbortSignal),
    )
  })
})
