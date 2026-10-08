// Mock catalog. Replace this module with real data / API calls later;
// consumers only use the helper functions at the bottom.
import { COMPONENTS } from './components'
import type { Brand, ComponentType, Part } from '../types'

export const BRANDS: Brand[] = [
  { id: 'st-croix', name: 'St. Croix' },
  { id: 'g-loomis', name: 'G. Loomis' },
  { id: 'orvis', name: 'Orvis' },
  { id: 'sage', name: 'Sage' },
  { id: 'shimano', name: 'Shimano' },
  { id: 'daiwa', name: 'Daiwa' },
  { id: 'penn', name: 'Penn' },
  { id: 'ross', name: 'Ross Reels' },
  { id: 'powerpro', name: 'PowerPro' },
  { id: 'berkley', name: 'Berkley' },
  { id: 'sufix', name: 'Sufix' },
  { id: 'seaguar', name: 'Seaguar' },
  { id: 'rio', name: 'RIO' },
  { id: 'umpqua', name: 'Umpqua' },
  { id: 'scientific-anglers', name: 'Scientific Anglers' },
]

// [name, price, ...spec values in the component's specColumns order]
type PartRow = [name: string, price: number, ...specs: string[]]

const CATALOG: Record<ComponentType, Record<string, PartRow[]>> = {
  rod: {
    'st-croix': [
      ['Mojo Bass Casting 7\'0"', 189.99, '7\'0"', 'Medium Heavy', 'Fast'],
      ['Triumph Spinning 6\'6"', 129.99, '6\'6"', 'Medium', 'Fast'],
      ['Legend Elite Fly 9\'0" 5wt', 545.0, '9\'0"', '5 wt', 'Fast'],
    ],
    'g-loomis': [
      ['E6X Bass Casting 7\'1"', 299.99, '7\'1"', 'Medium Heavy', 'Fast'],
      ['IMX-PRO Spinning 6\'10"', 449.99, '6\'10"', 'Medium', 'Extra Fast'],
      ['NRX+ Fly 9\'0" 5wt', 1095.0, '9\'0"', '5 wt', 'Fast'],
    ],
    orvis: [
      ['Clearwater Fly 9\'0" 5wt', 298.0, '9\'0"', '5 wt', 'Moderate Fast'],
      ['Recon Fly 9\'0" 6wt', 498.0, '9\'0"', '6 wt', 'Fast'],
      ['Helios F Fly 9\'0" 5wt', 1098.0, '9\'0"', '5 wt', 'Fast'],
    ],
    sage: [
      ['Foundation Fly 9\'0" 5wt', 375.0, '9\'0"', '5 wt', 'Fast'],
      ['Sonic Fly 9\'0" 6wt', 550.0, '9\'0"', '6 wt', 'Fast'],
      ['R8 Core Fly 9\'0" 5wt', 1150.0, '9\'0"', '5 wt', 'Moderate Fast'],
      ['Trout LL Fly 8\'6" 4wt', 1050.0, '8\'6"', '4 wt', 'Moderate'],
    ],
  },
  reel: {
    shimano: [
      ['Stradic FM 2500', 219.99, '2500', '6.0:1'],
      ['Vanford 3000', 279.99, '3000', '5.8:1'],
      ['Curado DC 150', 279.99, '150', '7.4:1'],
    ],
    daiwa: [
      ['BG MQ 2500', 159.99, '2500', '5.6:1'],
      ['Tatula SV TW 103', 229.99, '100', '7.1:1'],
      ['Exist 3000', 899.99, '3000', '6.2:1'],
    ],
    penn: [
      ['Battle III 3000', 129.95, '3000', '6.2:1'],
      ['Spinfisher VII 3500', 189.95, '3500', '6.2:1'],
      ['Slammer IV 4500', 279.95, '4500', '6.2:1'],
    ],
    ross: [
      ['Colorado 4/5', 245.0, '4/5', '1:1'],
      ['Animas 3/4', 335.0, '3/4', '1:1'],
      ['Evolution R 5/6', 495.0, '5/6', '1:1'],
    ],
  },
  line: {
    powerpro: [
      ['Spectra Braid 10 lb', 24.99, 'Braid', '10'],
      ['Spectra Braid 20 lb', 29.99, 'Braid', '20'],
      ['Super Slick V2 30 lb', 44.99, 'Braid', '30'],
    ],
    berkley: [
      ['Trilene XL 8 lb', 6.99, 'Monofilament', '8'],
      ['Trilene Big Game 15 lb', 9.99, 'Monofilament', '15'],
      ['FireLine 10 lb', 22.99, 'Fused', '10'],
    ],
    sufix: [
      ['Siege 12 lb', 9.99, 'Monofilament', '12'],
      ['Advance Mono 10 lb', 12.99, 'Monofilament', '10'],
      ['832 Braid 20 lb', 31.99, 'Braid', '20'],
    ],
    seaguar: [
      ['Red Label 10 lb', 14.99, 'Fluorocarbon', '10'],
      ['AbrazX 12 lb', 19.99, 'Fluorocarbon', '12'],
      ['InvizX 8 lb', 22.99, 'Fluorocarbon', '8'],
    ],
  },
  leader: {
    seaguar: [
      ['Blue Label Leader 20 lb', 19.99, 'Fluorocarbon', '20'],
      ['STS Salmon/Steelhead 12 lb', 24.99, 'Fluorocarbon', '12'],
      ['Grand Max 15 lb', 34.99, 'Fluorocarbon', '15'],
    ],
    rio: [
      ['Powerflex Trout Leader 9\' 4X', 4.95, 'Nylon', '6'],
      ['Powerflex Bass Leader 9\' 12 lb', 4.95, 'Nylon', '12'],
      ['Fluoroflex Trout Leader 9\' 5X', 10.95, 'Fluorocarbon', '4.4'],
    ],
    berkley: [
      ['Steelon Wire Leader 30 lb', 5.49, 'Wire', '30'],
      ['Trilene Big Game Leader 30 lb', 7.99, 'Monofilament', '30'],
      ['Vanish Fluorocarbon Leader 15 lb', 9.99, 'Fluorocarbon', '15'],
    ],
  },
  tippet: {
    rio: [
      ['Powerflex Tippet 5X', 5.95, '5X', 'Nylon'],
      ['Powerflex Plus Tippet 6X', 6.95, '6X', 'Nylon'],
      ['Fluoroflex Plus Tippet 4X', 15.95, '4X', 'Fluorocarbon'],
    ],
    orvis: [
      ['SuperStrong Plus Tippet 4X', 5.95, '4X', 'Nylon'],
      ['Mirage Tippet 5X', 19.95, '5X', 'Fluorocarbon'],
      ['Mirage Tippet 6X', 19.95, '6X', 'Fluorocarbon'],
    ],
    umpqua: [
      ['Deceiver X Tippet 5X', 6.95, '5X', 'Nylon'],
      ['Deceiver X Tippet 7X', 6.95, '7X', 'Nylon'],
      ['Superior X Fluoro Tippet 4X', 14.95, '4X', 'Fluorocarbon'],
    ],
    'scientific-anglers': [
      ['Absolute Trout Tippet 3X', 5.95, '3X', 'Nylon'],
      ['Absolute Trout Tippet 5X', 5.95, '5X', 'Nylon'],
      ['Absolute Fluoro Tippet 6X', 16.95, '6X', 'Fluorocarbon'],
    ],
  },
}

const PARTS: Part[] = COMPONENTS.flatMap(({ type, specColumns }) =>
  Object.entries(CATALOG[type]).flatMap(([brandId, rows]) =>
    rows.map(([name, price, ...specValues], i) => ({
      id: `${type}-${brandId}-${i + 1}`,
      component: type,
      brandId,
      name,
      price,
      specs: Object.fromEntries(specColumns.map((col, j) => [col, specValues[j] ?? '—'])),
    })),
  ),
)

const brandsById = new Map(BRANDS.map((b) => [b.id, b]))
const partsById = new Map(PARTS.map((p) => [p.id, p]))

export function getBrand(id: string | undefined): Brand | undefined {
  return id === undefined ? undefined : brandsById.get(id)
}

export function getPart(id: string | undefined): Part | undefined {
  return id === undefined ? undefined : partsById.get(id)
}

// Only brands that have parts for this component, sorted by name
export function getBrandsFor(component: ComponentType): Brand[] {
  return Object.keys(CATALOG[component])
    .flatMap((id) => brandsById.get(id) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name)) // fresh array, safe to sort in place
}

export function getParts(component: ComponentType, brandId: string | 'all'): Part[] {
  return PARTS.filter((p) => p.component === component && (brandId === 'all' || p.brandId === brandId))
}
