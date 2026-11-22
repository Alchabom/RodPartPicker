import { describe, expect, it } from 'vitest'
import { activeNavItem, builderLabel } from './navItems'

describe('activeNavItem', () => {
  it.each([
    ['/builder', '/builder'],
    ['/builder/line', '/builder'],
    ['/builder/reel/lamson', '/builder'],
    ['/builder/42', '/my-builds'],
    ['/builder/42/line', '/my-builds'],
    ['/builder/12/rod/all', '/my-builds'],
    ['/my-builds', '/my-builds'],
    ['/rack', '/rack'],
    ['/rack/7', '/rack'],
    ['/', null],
    ['/account', null],
    ['/login', null],
    ['/builders', null],
  ])('%s belongs to %s', (path, item) => {
    expect(activeNavItem(path)).toBe(item)
  })
})

describe('builderLabel', () => {
  it('has no count for an empty draft', () => {
    expect(builderLabel(0)).toEqual({ pill: null, accessibleName: 'Builder' })
  })
  it('counts a draft in progress', () => {
    expect(builderLabel(3)).toEqual({ pill: '3 of 5', accessibleName: 'Builder, 3 of 5 picked' })
  })
  it('calls a full draft ready', () => {
    expect(builderLabel(5)).toEqual({ pill: 'ready', accessibleName: 'Builder, rig ready' })
  })
})
