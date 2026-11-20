import { describe, expect, it } from 'vitest'
import { GUIDES, LINE_WIDTH, ROD_TIP, ROUTE_MARKS, ROUTE_SEGMENTS, TOP_GUIDE, lineWidthAt, pointOnRod } from './castGeometry'

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

describe('cast geometry', () => {
  it('has five guides: four up the rod and one at the tip', () => {
    expect(GUIDES).toHaveLength(5)
    expect(GUIDES[GUIDES.length - 1]).toBe(TOP_GUIDE)
  })

  it('shrinks the guides toward the tip', () => {
    const rods = GUIDES.slice(0, -1)
    for (let i = 1; i < rods.length; i++) {
      expect(rods[i].ring.r).toBeLessThan(rods[i - 1].ring.r)
      expect(rods[i].standoff).toBeLessThan(rods[i - 1].standoff)
    }
  })

  it('stands every guide off the rod, all on the same side of it', () => {
    for (const guide of GUIDES) {
      for (const foot of guide.feet) {
        const dx = guide.ring.x - foot.x
        const dy = guide.ring.y - foot.y
        expect(Math.hypot(dx, dy)).toBeGreaterThan(guide.ring.r)
      }
      // The guides sit on the rod's upper side, as in the approved mockup
      const base = pointOnRod(guide.t)
      expect(guide.ring.y).toBeLessThan(base.y)
    }
  })

  it('puts the top guide flush with the rod tip', () => {
    expect(TOP_GUIDE.t).toBe(1)
    expect(TOP_GUIDE.feet.some((f) => close(f.x, ROD_TIP.x) && close(f.y, ROD_TIP.y))).toBe(true)
  })

  it('threads the line through the centre of every guide ring', () => {
    const ends = ROUTE_SEGMENTS.map((seg) => seg[3])
    for (const guide of GUIDES) {
      expect(ends.some((p) => close(p.x, guide.ring.x) && close(p.y, guide.ring.y))).toBe(true)
    }
  })

  it('keeps the route continuous', () => {
    for (let i = 1; i < ROUTE_SEGMENTS.length; i++) {
      const [prevEnd, start] = [ROUTE_SEGMENTS[i - 1][3], ROUTE_SEGMENTS[i][0]]
      expect(close(prevEnd.x, start.x) && close(prevEnd.y, start.y)).toBe(true)
    }
  })

  it('makes the line thinnest at the rod and widest at the loop, as if coming toward you', () => {
    expect(lineWidthAt(0)).toBe(LINE_WIDTH.rod)
    expect(lineWidthAt(ROUTE_MARKS.leavesRod / 2)).toBe(LINE_WIDTH.rod)
    expect(lineWidthAt(ROUTE_MARKS.loopTop)).toBeCloseTo(LINE_WIDTH.loop)
    expect(lineWidthAt(ROUTE_MARKS.end)).toBeCloseTo(LINE_WIDTH.fly)
    expect(LINE_WIDTH.rod).toBeLessThan(LINE_WIDTH.loop)
    expect(LINE_WIDTH.fly).toBeLessThan(LINE_WIDTH.loop)
  })
})
