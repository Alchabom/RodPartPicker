import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// Positions survive a reload (and leaving the app in the same tab): React
// Router keeps each entry's key in history.state, so the key still matches
const STORAGE_KEY = 'rpp:scroll'

function loadPositions(): Map<string, number> {
  try {
    return new Map(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as [string, number][])
  } catch {
    return new Map()
  }
}

function hashTarget(hash: string): HTMLElement | null {
  if (!hash) return null
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    // A malformed escape (#%E0): look the raw id up instead
  }
  return document.getElementById(id)
}

/**
 * Page-to-page scrolling for BrowserRouter, which has none of its own: a new
 * page opens at its top (or at its #anchor), Back, Forward and reload return to
 * where you were, and a same-page replace (stripping ?copy= or ?save=) stays put.
 */
export function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef<Map<string, number> | null>(null)
  positions.current ??= loadPositions()
  const keyRef = useRef(location.key)
  const pathRef = useRef<string | null>(null)
  // A restore in progress: until the page is tall enough to reach it, or the
  // user scrolls on their own, clamped scroll events aren't recorded
  const restoring = useRef<number | null>(null)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const map = positions.current!

    const record = () => {
      const target = restoring.current
      if (target !== null) {
        if (Math.abs(window.scrollY - target) >= 2) return
        restoring.current = null
      }
      map.set(keyRef.current, window.scrollY)
    }
    const userScrolls = () => {
      restoring.current = null
    }
    const save = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...map].slice(-50)))
      } catch {
        // Storage full or blocked: positions just won't survive a reload
      }
    }
    // As the page grows (data arriving), keep trying to reach the target
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (restoring.current !== null) window.scrollTo(0, restoring.current)
          })
    resize?.observe(document.body)

    const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    window.addEventListener('scroll', record, { passive: true })
    for (const type of inputs) window.addEventListener(type, userScrolls, { passive: true })
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('scroll', record)
      for (const type of inputs) window.removeEventListener(type, userScrolls)
      window.removeEventListener('pagehide', save)
      resize?.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    keyRef.current = location.key
    const previousPath = pathRef.current
    pathRef.current = location.pathname
    restoring.current = null

    if (navigationType === 'POP') {
      const saved = positions.current!.get(location.key)
      // A first load with nothing saved stays where the browser put it
      if (saved === undefined && previousPath === null) return
      const target = saved ?? 0
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) >= 2) restoring.current = target
      return
    }
    if (navigationType === 'REPLACE' && previousPath === location.pathname) return

    const target = hashTarget(location.hash)
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [location.key, location.pathname, location.hash, navigationType])

  return null
}
