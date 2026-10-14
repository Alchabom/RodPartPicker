const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(price: number | null): string {
  return price === null ? '—' : usd.format(price)
}
