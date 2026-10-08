import { useContext } from 'react'
import { BuildContext, type BuildContextValue } from './buildContext'

export function useBuild(): BuildContextValue {
  const ctx = useContext(BuildContext)
  if (!ctx) throw new Error('useBuild must be used within a BuildProvider')
  return ctx
}
