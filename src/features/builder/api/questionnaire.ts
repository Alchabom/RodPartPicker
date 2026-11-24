// The questionnaire's picks and reasons come from the API
// (GET /api/questionnaire/recommend): api/app/questionnaire/rules/, one module per place.
import { apiFetch } from '@/lib/api'
import type { ComponentType, RecommendedPart } from '../types'

export type Level = 'low' | 'medium' | 'high'
export type Target = 'trout' | 'smallmouth' | 'predators'
export type Flies =
  | 'dries_nymphs'
  | 'small_streamers'
  | 'large_streamers'
  | 'large_topwater'
  | 'unweighted'
  | 'weighted'
  | 'both'

interface CreekAnswers {
  experience: Level
  place: 'small_creeks'
  trout: boolean
  onlyRod: boolean
  budget: Level
}

interface RiverAnswers {
  experience: Level
  place: 'large_rivers'
  target: Target
  flies: Flies
  budget: Level
}

// Each place has its own follow-up answers
export type Answers = CreekAnswers | RiverAnswers
export type Place = Answers['place']

interface RecommendationResponse {
  parts: { component: ComponentType; partId: number; reason: string }[]
}

function toQuery(answers: Answers): Record<string, string> {
  const shared = { experience: answers.experience, place: answers.place, budget: answers.budget }
  return answers.place === 'large_rivers'
    ? { ...shared, target: answers.target, flies: answers.flies }
    : { ...shared, trout: String(answers.trout), onlyRod: String(answers.onlyRod) }
}

export async function getRecommendation(answers: Answers, signal?: AbortSignal): Promise<RecommendedPart[]> {
  const query = new URLSearchParams(toQuery(answers))
  const data = await apiFetch<RecommendationResponse>(`/questionnaire/recommend?${query}`, { signal })
  return data.parts.map((part) => ({
    component: part.component,
    partId: `${part.component}-${part.partId}`,
    reason: part.reason,
  }))
}
