// Thin wrapper for calling our Express API. In dev, Vite proxies /api to
// http://localhost:3001 (see vite.config.ts), so paths stay relative.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
