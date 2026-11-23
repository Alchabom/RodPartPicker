import { describe, expect, it } from 'vitest'
import { STEP_ORDER, nextStep, previousStep, stepAfter } from './steps'

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
