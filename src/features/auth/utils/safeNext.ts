// Sign-in pages themselves are never a destination: going "next" to the page
// you're already on doesn't remount it, so its form would stay stuck busy.
const AUTH_PAGES = ['/login', '/welcome']

/**
 * Where to go after signing in: a path on this site, or "/".
 *
 * Rather than listing every trick ("//evil.example", "/\evil.example",
 * "/<tab>/evil.example" — browsers drop tabs and newlines from URLs and read
 * "\" as "/"), let the browser's own URL parser resolve `next` and accept it
 * only if it stays on our origin. So nobody can craft a login link that
 * redirects off the site.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/'
  const origin = window.location.origin
  let url: URL
  try {
    url = new URL(next, origin)
  } catch {
    return '/'
  }
  if (url.origin !== origin || AUTH_PAGES.includes(url.pathname)) return '/'
  return url.pathname + url.search + url.hash
}
