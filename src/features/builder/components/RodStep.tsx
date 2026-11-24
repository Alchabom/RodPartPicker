import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useSearchParams } from 'react-router'
import { NotFound } from '@components/NotFound'
import { Loading } from '@components/shop'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRodSeries, rodSeriesKeys, type RodSeries } from '../api/rodSeries'
import { useBuild } from '../hooks/useBuild'
import { useCatalog } from '../hooks/useCatalog'
import { useChoose } from '../hooks/useChoose'
import { brandFromSearch } from '../utils/brandFilter'
import { RodSeriesRow } from './RodSeriesRow'
import { StepLayout } from './StepLayout'

function holdsPart(series: RodSeries, partId: string | undefined): boolean {
  return series.sizes.some((size) => `rod-${size.id}` === partId)
}

/**
 * The guided builder's first step: rod series as rows that open to their
 * sizes, filtered by brand. Everything after is matched to the rod chosen here.
 * Unsure anglers can use Help me choose instead, which rigs all five.
 */
export function RodStep() {
  const { build, basePath } = useBuild()
  const { getBrandsFor } = useCatalog()
  const choose = useChoose('rod')
  const [searchParams] = useSearchParams()
  const needsRod = (useLocation().state as { needsRod?: boolean } | null)?.needsRod === true

  const brands = getBrandsFor('rod')
  const brand = brandFromSearch(searchParams, brands)

  const { data, error, isPending, refetch } = useQuery({
    queryKey: rodSeriesKeys.list(brand),
    queryFn: ({ signal }) => fetchRodSeries(brand, signal),
  })

  // The series holding the build's rod starts open. Worked out once per brand,
  // when its series first load, so later toggles stick
  const [open, setOpen] = useState<{ brand: string; ids: Set<number> } | null>(null)
  if (data && open?.brand !== brand) {
    setOpen({ brand, ids: new Set(data.filter((s) => holdsPart(s, build.rod)).map((s) => s.id)) })
  }
  const openIds = open?.brand === brand ? open.ids : new Set<number>()

  const toggle = (id: number) => {
    const ids = new Set(openIds)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    setOpen({ brand, ids })
  }

  if (data && data.length === 0) {
    return <NotFound message="We don't have any rods for that brand." backTo={basePath} backLabel="Back to your build" />
  }

  const renderRows = (rows: RodSeries[]) => (
    <div className="flex flex-col gap-3">
      {rows.map((series) => (
        <RodSeriesRow
          key={series.id}
          series={series}
          open={openIds.has(series.id)}
          onToggle={() => toggle(series.id)}
          selectedPartId={build.rod}
          onAdd={choose}
        />
      ))}
    </div>
  )

  // For all brands, one heading per brand, in the API's order
  const groups = data
    ? [...new Set(data.map((s) => s.brand.name))].map((name) => ({
        name,
        rows: data.filter((s) => s.brand.name === name),
      }))
    : []

  return (
    <StepLayout
      current="rod"
      title="Choose a rod"
      subtitle={
        needsRod && (
          <p role="status" className="mt-1 text-ink-2">
            Pick a rod first: everything else is matched to it.
          </p>
        )
      }
      brands={brands}
      brand={brand}
    >
      {data && (
        <p className="mb-4 text-sm text-ink-2">
          {data.length} series. Open one to see its sizes.
        </p>
      )}

      {isPending && (
        <Loading label="Loading rods" className="mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="rod-series-skeleton"
              className="flex items-center gap-4 rounded-lg border border-hairline p-3"
            >
              <Skeleton className="h-24 w-42" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-64 max-w-full" />
              </div>
            </div>
          ))}
        </Loading>
      )}

      {error && !data && (
        <div role="alert" className="mt-6 rounded-lg border border-hairline bg-card p-6">
          <p className="font-semibold">Couldn't load rods.</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection, then try again.</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data &&
        (brand === 'all'
          ? groups.map((group) => (
              <section key={group.name} className="mt-8 first-of-type:mt-0">
                <h2 className="mb-3 text-xl font-medium text-olive">{group.name}</h2>
                {renderRows(group.rows)}
              </section>
            ))
          : renderRows(data))}
    </StepLayout>
  )
}
