import { describe, expect, it } from 'vitest'
import { NO_FLAGS, flagsFromWarnings } from './flags'

const w = (code: string, message = code) => ({ code, message })

describe('flagsFromWarnings', () => {
  it.each([
    ['ROD_REEL_WEIGHT', 'reel'],
    ['ROD_LINE_WEIGHT', 'line'],
    ['REEL_LINE_WEIGHT', 'line'],
    ['ROD_LEADER_WEIGHT', 'leader'],
    ['LEADER_TIPPET_SIZE', 'tippet'],
  ])('flags %s on the %s', (code, part) => {
    expect(flagsFromWarnings([w(code, 'why')]).byPart).toEqual({ [part]: ['why'] })
  })

  it('keeps build-wide and unknown warnings off every part', () => {
    const flags = flagsFromWarnings([w('WATER_MISMATCH', 'mixed water'), w('NEW_CODE', 'new')])
    expect(flags.byPart).toEqual({})
    expect(flags.buildWide).toEqual(['mixed water', 'new'])
  })

  it('collects every warning on the same part, in order', () => {
    expect(flagsFromWarnings([w('ROD_LINE_WEIGHT', 'a'), w('REEL_LINE_WEIGHT', 'b')]).byPart.line).toEqual(['a', 'b'])
  })

  it('has no flags for no warnings', () => {
    expect(flagsFromWarnings([])).toEqual(NO_FLAGS)
  })
})
