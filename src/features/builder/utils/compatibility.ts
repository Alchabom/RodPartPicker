import type { Part } from '../types'

// Big-game, streamer and saltwater leaders (leaders table ids); everything
// else in the catalog is a trout leader suited to the rods we carry.
const NON_TROUT_LEADER_IDS = new Set([11, 12, 13])

// Whether `part` should be highlighted as a match for the selected rod.
// Rods and tippets are never highlighted.
export function fitsRod(part: Part, rod: Part): boolean {
  const weight = rod.lineWeight
  switch (part.component) {
    case 'reel':
      return weight !== undefined && part.lineWeightRange !== undefined
        && part.lineWeightRange.min <= weight && weight <= part.lineWeightRange.max
    case 'line':
      return weight !== undefined && part.lineWeight === weight
    case 'leader':
      return !NON_TROUT_LEADER_IDS.has(part.dbId)
    default:
      return false
  }
}
