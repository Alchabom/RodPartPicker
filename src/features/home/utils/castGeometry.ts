// The home page's cast, as geometry in the RidgeScene's 1200×460 viewBox: a fly
// rod rising from behind the second-nearest ridge, five guides on it (the last
// flush with the tip), and the line running up through them into a tight loop
// that lays out to the fly. Everything is computed once, when the module loads.

export interface Point {
  x: number
  y: number
}
type Cubic = [Point, Point, Point, Point]

export interface Guide {
  t: number // where on the rod, 0 (butt) to 1 (tip)
  standoff: number // how far the ring stands off the rod
  ring: Point & { r: number }
  feet: [Point, Point] // where its two legs meet the rod
}

// The rod: one curve whose tip flexes forward, as a rod does mid-cast. Its butt
// is hidden behind the ridge in front of it
const ROD: Cubic = [
  { x: 585, y: 410 },
  { x: 615, y: 352 },
  { x: 640, y: 312 },
  { x: 668, y: 292 },
]
export const ROD_PATH = 'M585 410 C615 352 640 312 668 292'
export const ROD_WIDTH = 1.4
export const ROD_TIP = ROD[3]

function bezier(q: Cubic, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return { x: a * q[0].x + b * q[1].x + c * q[2].x + d * q[3].x, y: a * q[0].y + b * q[1].y + c * q[2].y + d * q[3].y }
}

function tangent(q: Cubic, t: number): Point {
  const u = 1 - t
  const x = 3 * u * u * (q[1].x - q[0].x) + 6 * u * t * (q[2].x - q[1].x) + 3 * t * t * (q[3].x - q[2].x)
  const y = 3 * u * u * (q[1].y - q[0].y) + 6 * u * t * (q[2].y - q[1].y) + 3 * t * t * (q[3].y - q[2].y)
  const m = Math.hypot(x, y) || 1
  return { x: x / m, y: y / m }
}

export const pointOnRod = (t: number) => bezier(ROD, t)

// The side of the rod the guides stand on (its upper side here)
function guideSide(t: number): Point {
  const d = tangent(ROD, t)
  return { x: d.y, y: -d.x }
}

const along = (p: Point, d: Point, k: number): Point => ({ x: p.x + d.x * k, y: p.y + d.y * k })

// Four guides up the rod, standing closer and getting smaller toward the tip
const ROD_GUIDE_T = [0.47, 0.6, 0.73, 0.86]
const rodGuides: Guide[] = ROD_GUIDE_T.map((t, i) => {
  const k = i / (ROD_GUIDE_T.length - 1)
  const standoff = 3.0 - 1.2 * k
  const r = 0.72 - 0.25 * k
  const base = pointOnRod(t)
  const side = guideSide(t)
  const dir = tangent(ROD, t)
  const foot = r * 1.6
  return {
    t,
    standoff,
    ring: { ...along(base, side, standoff), r },
    feet: [along(base, dir, -foot), along(base, dir, foot)],
  }
})

// The top guide is built the same way, with its front leg on the very tip
const TOP_R = 0.45
const TOP_STANDOFF = 1.7
export const TOP_GUIDE: Guide = (() => {
  const side = guideSide(1)
  const dir = tangent(ROD, 1)
  return {
    t: 1,
    standoff: TOP_STANDOFF,
    ring: { ...along(ROD_TIP, side, TOP_STANDOFF), r: TOP_R },
    feet: [ROD_TIP, along(ROD_TIP, dir, -TOP_R * 2.2)],
  }
})()

export const GUIDES: Guide[] = [...rodGuides, TOP_GUIDE]

// The leg ends at the ring's edge nearest the rod
export function guideLegs(g: Guide): [Point, Point][] {
  const side = guideSide(g.t)
  const edge = along(g.ring, side, -g.ring.r)
  return g.feet.map((f) => [f, edge])
}

// The line's route: from the reel (behind the ridge) through each guide ring,
// sagging slightly away from the rod between guides, then out into the cast
const SAG = 0.07
const reel = along(pointOnRod(0.3), guideSide(0.3), 3.6)
const threaded = [reel, ...GUIDES.map((g) => ({ x: g.ring.x, y: g.ring.y }))]
const rodSegments: Cubic[] = threaded.slice(1).map((b, i) => {
  const a = threaded[i]
  const side = guideSide(Math.min(0.3 + (i + 0.5) * 0.11, 0.97))
  const sag = SAG * Math.hypot(b.x - a.x, b.y - a.y)
  // A quadratic sag, written as the cubic it equals
  const q = along({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, side, sag * 2)
  return [a, { x: a.x + (2 / 3) * (q.x - a.x), y: a.y + (2 / 3) * (q.y - a.y) }, { x: b.x + (2 / 3) * (q.x - b.x), y: b.y + (2 / 3) * (q.y - b.y) }, b]
})
const top = threaded[threaded.length - 1]
const p = (x: number, y: number): Point => ({ x, y })
// Out of the top guide the line is cast down into the page: it swings out in
// front of the rod and falls to the scene's bottom center (x 600 sits at 50% of
// the width under any xMidYMid slice crop), leaving straight down, where the
// home page's steps pick it up. It stays right of the rod all the way down
export const LINE_EXIT: Point = p(600, 460)
const dropSegments: Cubic[] = [[top, p(735, 300), p(600, 400), LINE_EXIT]]
export const ROUTE_SEGMENTS: Cubic[] = [...rodSegments, ...dropSegments]

const f = (n: number) => Number(n.toFixed(2))
export const CAST_ROUTE =
  `M${f(reel.x)} ${f(reel.y)} ` +
  ROUTE_SEGMENTS.map(([, c1, c2, e]) => `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(e.x)} ${f(e.y)}`).join(' ')

// The line is thinnest in the guides and widens as it falls toward you, to
// about the steps' 4px line at the scene's edge
export const LINE_WIDTH = { rod: 0.5, exit: 2.5 }

const STEPS = 40
const samples: { at: Point; dir: Point; length: number }[] = []
const segmentStarts: number[] = []
let length = 0
ROUTE_SEGMENTS.forEach((seg, k) => {
  segmentStarts.push(length)
  for (let j = k === 0 ? 0 : 1; j <= STEPS; j++) {
    const at = bezier(seg, j / STEPS)
    const prev = samples[samples.length - 1]
    if (prev) length += Math.hypot(at.x - prev.at.x, at.y - prev.at.y)
    samples.push({ at, dir: tangent(seg, j / STEPS), length })
  }
})

/** Distances along the line: where it leaves the top guide, and its end. */
export const ROUTE_MARKS = {
  leavesRod: segmentStarts[rodSegments.length],
  end: length,
}

export function lineWidthAt(distance: number): number {
  const { leavesRod, end } = ROUTE_MARKS
  if (distance <= leavesRod) return LINE_WIDTH.rod
  return LINE_WIDTH.rod + ((LINE_WIDTH.exit - LINE_WIDTH.rod) * (distance - leavesRod)) / (end - leavesRod)
}

// A stretch of the line as one filled outline whose width follows lineWidthAt,
// so it widens smoothly with no steps
function outline(from: number): string {
  const left: Point[] = []
  const right: Point[] = []
  for (const { at, dir, length: l } of samples) {
    if (l < from) continue
    const h = lineWidthAt(l) / 2
    left.push({ x: at.x - dir.y * h, y: at.y + dir.x * h })
    right.push({ x: at.x + dir.y * h, y: at.y - dir.x * h })
  }
  return 'M' + [...left, ...right.reverse()].map((q) => `${f(q.x)} ${f(q.y)}`).join(' L') + 'Z'
}

/** The whole line, reel to exit: drawn behind the near ridges, like the rod. */
export const LINE_OUTLINE = outline(0)
/** The drop from the tip: drawn again in front of the near ridges, so the line
    visibly falls out of the scene. */
export const DROP_OUTLINE = outline(ROUTE_MARKS.leavesRod)
