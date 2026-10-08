import { Link } from 'react-router'
import { ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { getBrand, getPart } from '../api/mockParts'
import { useBuild } from '../hooks/useBuild'
import type { ComponentInfo } from '../types'
import { formatPrice } from '../utils/formatPrice'
import { BrandMenu } from './BrandMenu'

export function ComponentRow({ component }: { component: ComponentInfo }) {
  const { build, removePart } = useBuild()
  const part = getPart(build[component.type])
  const Icon = component.icon

  return (
    <TableRow>
      <TableCell className="w-44">
        <Link
          to={`/builder/${component.type}/all`}
          className="inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
        >
          <Icon className="size-[18px]" aria-hidden />
          {component.label}
        </Link>
      </TableCell>

      <TableCell>
        {part ? (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="font-medium">{part.name}</div>
              <div className="text-xs text-muted-foreground">{getBrand(part.brandId)?.name}</div>
            </div>
            <BrandMenu
              component={component}
              trigger={
                <Button size="sm" variant="outline">
                  Change <ChevronDown data-icon="inline-end" />
                </Button>
              }
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove ${component.label}`}
              onClick={() => removePart(component.type)}
            >
              <X />
            </Button>
          </div>
        ) : (
          <BrandMenu
            component={component}
            trigger={
              <Button size="sm">
                <Plus data-icon="inline-start" /> Choose {component.article} {component.label}
              </Button>
            }
          />
        )}
      </TableCell>

      <TableCell className="w-28 text-right tabular-nums">
        {part ? formatPrice(part.price) : <span className="text-muted-foreground">—</span>}
      </TableCell>
    </TableRow>
  )
}
