import { describe, expect, it } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats dollars with cents', () => expect(formatPrice(199.99)).toBe('$199.99'))
  it('shows a dash for no price', () => expect(formatPrice(null)).toBe('—'))
})
