import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * Page-to-page scrolling for BrowserRouter, which has none of its own: a new
 * page opens at its top (or at its #anchor), Back and Forward return to where
 * you were, and a same-page replace (stripping ?copy= or ?save=) stays put.
 */
export function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const keyRef = useRef(location.key)
  const pathRef = useRef<string | null>(null)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const record = () => positions.current.set(keyRef.current, window.scrollY)
    window.addEventListener('scroll', record, { passive: true })
    return () => window.removeEventListener('scroll', record)
  }, [])

  useLayoutEffect(() => {
    keyRef.current = location.key
    const previousPath = pathRef.current
    pathRef.current = location.pathname

    if (navigationType === 'POP') {
      window.scrollTo(0, positions.current.get(location.key) ?? 0)
      return
    }
    if (navigationType === 'REPLACE' && previousPath === location.pathname) return

    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [location.key, location.pathname, location.hash, navigationType])

  return null
}
