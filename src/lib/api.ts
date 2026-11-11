// Thin wrapper for calling our FastAPI API. In dev, Vite proxies /api to
// http://localhost:3001 (see vite.config.ts), so paths stay relative.
//
// Auth: the API keeps the session in httpOnly cookies, which the browser
// sends by itself. The access token lasts 15 minutes; when a request gets a
// 401, we ask /auth/refresh for new cookies once and retry the request.
// Diagrams of the flow: docs/auth/sessions.md.

/** A non-OK response. `detail` is the parsed JSON body (or null). */
export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown
  readonly headers: Headers

  constructor(status: number, detail: unknown, headers: Headers) {
    // FastAPI errors look like {"detail": "..."}; show that text when present
    const text =
      typeof detail === 'object' && detail !== null && 'detail' in detail
        ? `: ${String(detail.detail)}`
        : ''
    super(`API ${status}${text}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.headers = headers
  }
}

// A 401 from these means "wrong code" or "no session", not "token expired",
// so refreshing wouldn't help (and refreshing /auth/refresh would loop).
const NO_REFRESH = ['/auth/code', '/auth/verify', '/auth/refresh', '/auth/logout']

// One refresh at a time: if five requests get a 401 together, they all wait
// on the same /auth/refresh call. A second refresh would send the token the
// first one just replaced, and the API treats a replaced token as stolen.
let refreshPromise: Promise<boolean> | null = null

function refreshOnce(): Promise<boolean> {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then(
      (res) => res.ok,
      () => false, // network error: treat as "couldn't refresh"
    )
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

const sessionExpiredListeners = new Set<() => void>()

/** Call `listener` when a refresh fails. Returns an unsubscribe function. */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

function send(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

async function toApiError(res: Response): Promise<ApiError> {
  let detail: unknown = null
  try {
    detail = await res.json()
  } catch {
    // Not JSON (e.g. a proxy error page): keep null
  }
  return new ApiError(res.status, detail, res.headers)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init)

  if (res.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshOnce()) {
      res = await send(path, init) // retry once; a second 401 is thrown below
    } else {
      const error = await toApiError(res)
      sessionExpiredListeners.forEach((listener) => listener())
      throw error
    }
  }

  if (!res.ok) throw await toApiError(res)
  return (res.status === 204 ? undefined : await res.json()) as T
}
