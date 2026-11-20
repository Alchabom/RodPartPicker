import { describe, expect, it } from 'vitest'
import { formatSeriesSummary } from '../api/rodSeries'
import { capitalize, formatLength } from './format'

describe('formatLength', () => {
  it('writes inches as feet and inches', () => {
    expect(formatLength(108)).toBe(`9'0"`)
    expect(formatLength(102)).toBe(`8'6"`)
    expect(formatLength(138)).toBe(`11'6"`)
  })
})

describe('capitalize', () => {
  it('capitalizes the first letter, and shows a dash for null', () => {
    expect(capitalize('fast')).toBe('Fast')
    expect(capitalize(null)).toBe('—')
  })
})

describe('formatSeriesSummary', () => {
  const base = {
    sizeCount: 19,
    minLineWeight: 3,
    maxLineWeight: 9,
    minLengthIn: 102,
    maxLengthIn: 120,
    minPrice: 1100,
    maxPrice: 1100,
  }

  it('shows ranges and collapses equal ends', () => {
    expect(formatSeriesSummary(base)).toBe(`19 sizes · 3–9 wt · 8'6"–10'0" · $1,100.00`)
  })

  it('collapses a single weight and length, and shows a price range', () => {
    expect(
      formatSeriesSummary({ ...base, sizeCount: 4, minLineWeight: 5, maxLineWeight: 5, minLengthIn: 108, maxLengthIn: 108, minPrice: 299, maxPrice: 309 }),
    ).toBe(`4 sizes · 5 wt · 9'0" · $299.00–$309.00`)
  })

  it('says size for one size', () => {
    expect(formatSeriesSummary({ ...base, sizeCount: 1 })).toMatch(/^1 size ·/)
  })
})
