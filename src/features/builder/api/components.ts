import { Disc3, FishingRod, Link as LinkIcon, Minus, Spline } from 'lucide-react'
import type { ComponentInfo, ComponentType } from '../types'

// Display order of the build list
export const COMPONENTS: ComponentInfo[] = [
  { type: 'rod', label: 'Rod', plural: 'Rods', article: 'a', icon: FishingRod, specColumns: ['Length', 'Power', 'Action'] },
  { type: 'reel', label: 'Reel', plural: 'Reels', article: 'a', icon: Disc3, specColumns: ['Size', 'Gear Ratio'] },
  { type: 'line', label: 'Line', plural: 'Lines', article: 'a', icon: Spline, specColumns: ['Type', 'Test (lb)'] },
  { type: 'leader', label: 'Leader', plural: 'Leaders', article: 'a', icon: LinkIcon, specColumns: ['Material', 'Test (lb)'] },
  { type: 'tippet', label: 'Tippet', plural: 'Tippets', article: 'a', icon: Minus, specColumns: ['X-Size', 'Material'] },
]

const componentsByType = new Map(COMPONENTS.map((c) => [c.type, c]))

export function getComponentInfo(type: string | undefined): ComponentInfo | undefined {
  return componentsByType.get(type as ComponentType)
}
