// The questionnaire's picks and reasons come from the API
// (GET /api/questionnaire/recommend): api/app/questionnaire/rules.py.
import { apiFetch } from '@/lib/api'
import type { ComponentType, RecommendedPart } from '../types'

export type Level = 'low' | 'medium' | 'high'

export interface Answers {
  experience: Level
  place: 'small_creeks'
  trout: boolean
  onlyRod: boolean
  budget: Level
}

interface RecommendationResponse {
  parts: { component: ComponentType; partId: number; reason: string }[]
}

export async function getRecommendation(answers: Answers, signal?: AbortSignal): Promise<RecommendedPart[]> {
  const query = new URLSearchParams({
    experience: answers.experience,
    place: answers.place,
    trout: String(answers.trout),
    onlyRod: String(answers.onlyRod),
    budget: answers.budget,
  })
  const data = await apiFetch<RecommendationResponse>(`/questionnaire/recommend?${query}`, { signal })
  return data.parts.map((part) => ({
    component: part.component,
    partId: `${part.component}-${part.partId}`,
    reason: part.reason,
  }))
}
