import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

// Client errors (4xx) won't change on retry; anything else gets up to 3 retries.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 3,
    },
  },
})
