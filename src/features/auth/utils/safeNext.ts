/**
 * Where to go after signing in. Only same-site paths are allowed: "/builder"
 * is fine, but "//evil.example" (a protocol-relative URL to another site),
 * "/\evil.example" (browsers read "\" as "/") and "https://..." fall back to
 * "/", so nobody can craft a login link that redirects off the site.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/'
  const second = next.charAt(1)
  return second === '/' || second === '\\' ? '/' : next
}
