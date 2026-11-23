import type { BuildWarning } from '../api/compatibility'
import type { ComponentType } from '../types'

/** Build warnings sorted by the part each one is about. */
export interface BuildFlags {
  byPart: Partial<Record<ComponentType, string[]>>
  buildWide: string[] // about the whole build (mixed water) or an unknown code
}

export const NO_FLAGS: BuildFlags = { byPart: {}, buildWide: [] }

// Each rule compares two parts; the warning flags the later one in rig order,
// the part to change. Codes come from api/app/compatibility/rules.py
const FLAGGED_PART: Record<string, ComponentType> = {
  ROD_REEL_WEIGHT: 'reel',
  ROD_LINE_WEIGHT: 'line',
  REEL_LINE_WEIGHT: 'line',
  ROD_LEADER_WEIGHT: 'leader',
  LEADER_TIPPET_SIZE: 'tippet',
}

export function flagsFromWarnings(warnings: BuildWarning[]): BuildFlags {
  const flags: BuildFlags = { byPart: {}, buildWide: [] }
  for (const { code, message } of warnings) {
    const part = FLAGGED_PART[code]
    if (part) (flags.byPart[part] ??= []).push(message)
    else flags.buildWide.push(message)
  }
  return flags
}
