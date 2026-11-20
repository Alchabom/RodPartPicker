import { describe, expect, it } from 'vitest'
import { rackMessage } from './rackMessage'

describe('rackMessage', () => {
  it.each([
    ['Already published', 'Already on the Rack'],
    ['Add all five parts before publishing', 'Add all five parts before posting'],
    ['Not published', 'Not on the Rack'],
  ])('maps %s', (input, expected) => {
    expect(rackMessage(input)).toBe(expected)
  })

  it('passes unknown messages through', () => {
    expect(rackMessage('Something else')).toBe('Something else')
  })
})
