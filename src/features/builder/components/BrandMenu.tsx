import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LayoutGrid } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getBrandsFor } from '../api/mockParts'
import type { ComponentInfo } from '../types'
import styles from '../styles/BrandMenu.module.css'

// "Scientific Anglers" -> "SA", "Sage" -> "S"
function initials(name: string): string {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

interface BrandMenuProps {
  component: ComponentInfo
  trigger: ReactNode
}

export function BrandMenu({ component, trigger }: BrandMenuProps) {
  const brands = getBrandsFor(component.type)
  const basePath = `/builder/${component.type}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className={styles.menu}>
        <DropdownMenuLabel>{component.label} brands</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {brands.map((brand) => (
          <DropdownMenuItem key={brand.id} asChild>
            <Link to={`${basePath}/${brand.id}`}>
              <Badge variant="secondary" className={styles.initials}>
                {initials(brand.name)}
              </Badge>
              {brand.name}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`${basePath}/all`}>
            <LayoutGrid />
            All brands
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
