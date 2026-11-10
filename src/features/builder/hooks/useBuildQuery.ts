import { toBuildQuery } from '../api/compatibility'
import { useBuild } from './useBuild'
import { useCatalog } from './useCatalog'

// The current build as a query string for the compatibility API. getPart drops
// ids that are no longer in the catalog, so an old saved build can't send one.
export function useBuildQuery() {
  const { build } = useBuild()
  const { getPart } = useCatalog()
  const ids = {
    rodId: getPart(build.rod)?.dbId,
    reelId: getPart(build.reel)?.dbId,
    flyLineId: getPart(build.line)?.dbId,
    leaderId: getPart(build.leader)?.dbId,
    tippetId: getPart(build.tippet)?.dbId,
  }
  return {
    query: toBuildQuery(ids),
    selectedCount: Object.values(ids).filter((id) => id !== undefined).length,
  }
}
