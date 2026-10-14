// Loads the parts catalog from the Express API (GET /api/parts/:category)
// and maps each row into the UI's Part shape.
import { apiFetch } from '@/lib/api'
import type { Brand, Catalog, ComponentType, Part } from '../types'

type Water = 'fresh' | 'salt' | 'both'

// Row shapes returned by server/src/routes/parts.ts
interface RodRow {
  id: number
  brand: string
  model: string
  action: string | null
  water: Water
  lineWeight: number
  lengthIn: number
  pieces: number
  price: number | null
}

interface ReelRow {
  id: number
  brand: string
  model: string
  water: Water
  minLineWeight: number
  maxLineWeight: number
  price: number | null
}

interface LineRow {
  id: number
  brand: string
  model: string
  type: string | null
  water: Water
  lineWeight: number
  headWeightGrains: number | null
  price: number | null
}

interface LeaderRow {
  id: number
  brand: string
  model: string
  material: string
  water: Water
  lengthFt: number
  xSize: string | null
  strengthLb: number | null
  price: number | null
}

interface TippetRow {
  id: number
  brand: string
  model: string
  material: string
  water: Water
  xSize: string
  strengthLb: number | null
  spoolYards: number | null
  price: number | null
}

const NONE = '—'

const WATER_LABELS: Record<Water, string> = { fresh: 'Fresh', salt: 'Salt', both: 'Fresh & salt' }

// "Scientific Anglers" -> "scientific-anglers"
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function capitalize(value: string | null): string {
  return value ? value[0].toUpperCase() + value.slice(1) : NONE
}

function orNone(value: number | string | null): string {
  return value === null ? NONE : String(value)
}

// 108 -> 9'0"
function formatLength(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function basePart(component: ComponentType, row: { id: number; brand: string; model: string; price: number | null }) {
  return {
    id: `${component}-${row.id}`,
    dbId: row.id,
    component,
    brandId: slugify(row.brand),
    name: row.model,
    price: row.price,
  }
}

function toRod(row: RodRow): Part {
  return {
    ...basePart('rod', row),
    lineWeight: row.lineWeight,
    specs: {
      Length: formatLength(row.lengthIn),
      'Line Wt': `${row.lineWeight} wt`,
      Action: capitalize(row.action),
      Water: WATER_LABELS[row.water],
      Pieces: String(row.pieces),
    },
  }
}

function toReel(row: ReelRow): Part {
  return {
    ...basePart('reel', row),
    lineWeightRange: { min: row.minLineWeight, max: row.maxLineWeight },
    specs: {
      'Line Wt': `${row.minLineWeight}–${row.maxLineWeight} wt`,
      Water: WATER_LABELS[row.water],
    },
  }
}

function toLine(row: LineRow): Part {
  return {
    ...basePart('line', row),
    lineWeight: row.lineWeight,
    specs: {
      'Line Wt': `${row.lineWeight} wt`,
      Type: capitalize(row.type),
      'Head (gr)': orNone(row.headWeightGrains),
      Water: WATER_LABELS[row.water],
    },
  }
}

function toLeader(row: LeaderRow): Part {
  return {
    ...basePart('leader', row),
    specs: {
      Length: `${row.lengthFt} ft`,
      'X-Size': orNone(row.xSize),
      Material: capitalize(row.material),
      'Test (lb)': orNone(row.strengthLb),
      Water: WATER_LABELS[row.water],
    },
  }
}

function toTippet(row: TippetRow): Part {
  return {
    ...basePart('tippet', row),
    specs: {
      'X-Size': row.xSize,
      Material: capitalize(row.material),
      'Test (lb)': orNone(row.strengthLb),
      'Spool (yd)': orNone(row.spoolYards),
    },
  }
}

export async function fetchCatalog(signal?: AbortSignal): Promise<Catalog> {
  const [rods, reels, lines, leaders, tippets] = await Promise.all([
    apiFetch<RodRow[]>('/parts/rod', { signal }),
    apiFetch<ReelRow[]>('/parts/reel', { signal }),
    apiFetch<LineRow[]>('/parts/line', { signal }),
    apiFetch<LeaderRow[]>('/parts/leader', { signal }),
    apiFetch<TippetRow[]>('/parts/tippet', { signal }),
  ])
  const allRows = [...rods, ...reels, ...lines, ...leaders, ...tippets]
  const parts = [
    ...rods.map(toRod),
    ...reels.map(toReel),
    ...lines.map(toLine),
    ...leaders.map(toLeader),
    ...tippets.map(toTippet),
  ]
  return createCatalog(allRows.map((row) => ({ id: slugify(row.brand), name: row.brand })), parts)
}

function createCatalog(brands: Brand[], parts: Part[]): Catalog {
  const brandsById = new Map(brands.map((b) => [b.id, b]))
  const partsById = new Map(parts.map((p) => [p.id, p]))

  return {
    getBrand: (id) => (id === undefined ? undefined : brandsById.get(id)),
    getPart: (id) => (id === undefined ? undefined : partsById.get(id)),
    // Only brands that have parts for this component, sorted by name
    getBrandsFor: (component) =>
      [...new Set(parts.filter((p) => p.component === component).map((p) => p.brandId))]
        .flatMap((id) => brandsById.get(id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name)),
    getParts: (component, brandId) =>
      parts.filter((p) => p.component === component && (brandId === 'all' || p.brandId === brandId)),
  }
}
