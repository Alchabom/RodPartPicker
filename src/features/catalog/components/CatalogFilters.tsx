import { useState } from 'react'
import type { CatalogParams } from '@/lib/publishedKeys'

interface CatalogFiltersProps {
  params: CatalogParams
  onChange: (changes: { weight?: number; maxPrice?: number }) => void
}

const WEIGHTS = Array.from({ length: 15 }, (_, i) => i + 1)
const fieldClass = 'h-9 rounded-md border bg-background px-3 text-sm'

export function CatalogFilters({ params, onChange }: CatalogFiltersProps) {
  const urlPrice = params.maxPrice === undefined ? '' : String(params.maxPrice)
  const [price, setPrice] = useState(urlPrice)
  // Follow the URL when it changes underneath us (Back, Clear filters)
  const [seenUrlPrice, setSeenUrlPrice] = useState(urlPrice)
  if (seenUrlPrice !== urlPrice) {
    setSeenUrlPrice(urlPrice)
    setPrice(urlPrice)
  }

  const commitPrice = () => {
    const trimmed = price.trim()
    const value = Number(trimmed)
    const valid = trimmed !== '' && Number.isFinite(value) && value >= 0
    if (valid && value !== params.maxPrice) onChange({ weight: params.weight, maxPrice: value })
    else if (!valid) {
      if (params.maxPrice !== undefined) onChange({ weight: params.weight, maxPrice: undefined })
      setPrice('')
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="catalog-weight" className="text-sm font-medium">
          Rod weight
        </label>
        <select
          id="catalog-weight"
          className={fieldClass}
          value={params.weight ?? ''}
          onChange={(e) =>
            onChange({ weight: e.target.value === '' ? undefined : Number(e.target.value), maxPrice: params.maxPrice })
          }
        >
          <option value="">Any weight</option>
          {WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w}wt
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="catalog-max-price" className="text-sm font-medium">
          Max price ($)
        </label>
        <input
          id="catalog-max-price"
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          className={`${fieldClass} w-32`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitPrice()
          }}
        />
      </div>
    </div>
  )
}
