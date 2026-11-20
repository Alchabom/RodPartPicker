// Display formatting shared by the parts catalog and the rod series page

export type Water = 'fresh' | 'salt' | 'both'

export const NONE = '—'

export const WATER_LABELS: Record<Water, string> = { fresh: 'Fresh', salt: 'Salt', both: 'Fresh & salt' }

export function capitalize(value: string | null): string {
  return value ? value[0].toUpperCase() + value.slice(1) : NONE
}

// 108 -> 9'0"
export function formatLength(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}
