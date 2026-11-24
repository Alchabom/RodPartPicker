import { describe, expect, it } from 'vitest'
import { STEP_ORDER, nextAction, nextStep, previousStep, stepAfter } from './steps'

const rod = 'rod-1'
const reel = 'reel-1'
const line = 'line-1'
const leader = 'leader-1'
const tippet = 'tippet-1'

describe('steps', () => {
  it('runs in rig order', () => {
    expect(STEP_ORDER).toEqual(['rod', 'reel', 'line', 'leader', 'tippet'])
  })

  it('goes to the next empty step', () => {
    expect(nextStep({ rod }, 'rod')).toBe('reel')
    expect(nextStep({ rod, reel, leader }, 'reel')).toBe('line')
  })

  it('goes to the summary when every part is picked', () => {
    expect(nextStep({ rod, reel, line, leader, tippet }, 'tippet')).toBe('summary')
  })

  it('comes back around to a skipped step', () => {
    expect(nextStep({ rod, line, leader, tippet }, 'tippet')).toBe('reel')
  })

  it('skips to the next step in order, then the summary', () => {
    expect(stepAfter('reel')).toBe('line')
    expect(stepAfter('tippet')).toBe('summary')
  })

  it('knows the step before, except for the rod', () => {
    expect(previousStep('rod')).toBeUndefined()
    expect(previousStep('line')).toBe('reel')
  })
})

describe('nextAction', () => {
  // The catalog has every part except reel-999, which it has dropped
  const getPart = (id: string | undefined) => (id && id !== 'reel-999' ? { id } : undefined)

  it('offers the next empty step once this one has a part', () => {
    expect(nextAction({ rod: 'rod-1', reel: 'reel-2' }, 'reel', getPart)).toEqual({ target: 'line', label: 'Next: line' })
  })

  it('offers to skip an empty step', () => {
    expect(nextAction({ rod: 'rod-1' }, 'reel', getPart)).toEqual({ target: 'line', label: 'Skip to line' })
  })

  it('loops back to a skipped step', () => {
    const build = { rod: 'rod-1', line: 'line-1', leader: 'leader-1', tippet: 'tippet-1' }
    expect(nextAction(build, 'tippet', getPart)).toEqual({ target: 'reel', label: 'Next: reel' })
  })

  it('never points back at the step you are on', () => {
    const build = { rod: 'rod-1', reel: 'reel-1', line: 'line-1', leader: 'leader-1' }
    expect(nextAction(build, 'tippet', getPart)).toEqual({ target: 'summary', label: 'Review rig' })
  })

  it('reviews the rig once all five are picked', () => {
    const build = { rod: 'rod-1', reel: 'reel-1', line: 'line-1', leader: 'leader-1', tippet: 'tippet-1' }
    expect(nextAction(build, 'line', getPart)).toEqual({ target: 'summary', label: 'Review rig' })
  })

  it('counts a part the catalog has dropped as empty', () => {
    expect(nextAction({ rod: 'rod-1', reel: 'reel-999' }, 'rod', getPart)).toEqual({ target: 'reel', label: 'Next: reel' })
  })
})
