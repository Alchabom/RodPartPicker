import { describe, expect, it } from 'vitest'
import { SAMPLE_RIG } from './sampleRig'

// Mirrors check_build in api/app/compatibility/rules.py
describe('SAMPLE_RIG', () => {
  const byType = Object.fromEntries(SAMPLE_RIG.parts.map((p) => [p.type, p]))

  it('has a rod, reel and line', () => expect(Object.keys(byType).sort()).toEqual(['line', 'reel', 'rod']))

  it('line weight matches the rod', () => expect(byType.line.lineWeight).toBe(byType.rod.lineWeight))

  it('reel range covers the rod and the line', () => {
    for (const w of [byType.rod.lineWeight!, byType.line.lineWeight!]) {
      expect(w).toBeGreaterThanOrEqual(byType.reel.minLineWeight!)
      expect(w).toBeLessThanOrEqual(byType.reel.maxLineWeight!)
    }
  })

  it('water tags agree', () => {
    const waters = new Set(SAMPLE_RIG.parts.map((p) => p.water).filter((w) => w !== 'both'))
    expect(waters.size).toBeLessThanOrEqual(1)
  })
})
