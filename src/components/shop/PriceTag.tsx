import { formatPrice } from '@utils/formatPrice'
import { cn } from '@/lib/utils'

export function PriceTag({ price, className }: { price: number | null; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatPrice(price)}</span>
}
