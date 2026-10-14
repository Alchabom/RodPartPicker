import { Disc3, FishingRod, Link as LinkIcon, Minus, Spline } from 'lucide-react'
import type { ComponentInfo, ComponentType } from '../types'

// Display order of the build list
export const COMPONENTS: ComponentInfo[] = [
  { type: 'rod', label: 'Rod', plural: 'Rods', article: 'a', icon: FishingRod, specColumns: ['Length', 'Line Wt', 'Action', 'Water', 'Pieces'] },
  { type: 'reel', label: 'Reel', plural: 'Reels', article: 'a', icon: Disc3, specColumns: ['Line Wt', 'Water'] },
  { type: 'line', label: 'Line', plural: 'Lines', article: 'a', icon: Spline, specColumns: ['Line Wt', 'Type', 'Head (gr)', 'Water'] },
  { type: 'leader', label: 'Leader', plural: 'Leaders', article: 'a', icon: LinkIcon, specColumns: ['Length', 'X-Size', 'Material', 'Test (lb)', 'Water'] },
  { type: 'tippet', label: 'Tippet', plural: 'Tippets', article: 'a', icon: Minus, specColumns: ['X-Size', 'Material', 'Test (lb)', 'Spool (yd)'] },
]

const componentsByType = new Map(COMPONENTS.map((c) => [c.type, c]))

export function getComponentInfo(type: string | undefined): ComponentInfo | undefined {
  return componentsByType.get(type as ComponentType)
}
