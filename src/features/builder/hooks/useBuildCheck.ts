import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { checkBuild, compatibilityKeys } from '../api/compatibility'
import { NO_FLAGS, flagsFromWarnings, type BuildFlags } from '../utils/flags'
import { useBuildQuery } from './useBuildQuery'

/**
 * The whole build's compatibility check, as flags on the parts that no longer
 * fit. Needs two parts to compare. Optional: on failure there are no flags and
 * `failed` is set, and nothing is blocked.
 */
export function useBuildCheck(): { flags: BuildFlags; failed: boolean } {
  const { query, selectedCount } = useBuildQuery()
  const enabled = selectedCount >= 2

  // No placeholderData: flags for the previous selection never show while the
  // next request is running
  const { data, error } = useQuery({
    queryKey: compatibilityKeys.check(query),
    queryFn: ({ signal }) => checkBuild(query, signal),
    enabled,
  })

  useEffect(() => {
    if (error) console.error('Could not check the build', error)
  }, [error])

  if (!enabled || !data) return { flags: NO_FLAGS, failed: enabled && error !== null }
  return { flags: flagsFromWarnings(data), failed: false }
}
