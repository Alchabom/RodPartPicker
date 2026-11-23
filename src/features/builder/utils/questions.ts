// The questionnaire's wording, as data, so editing it doesn't touch the dialog.
// Each option's value becomes that question's answer (see QuestionnaireDialog).
// Experience and place come first, then the place's two follow-ups, then budget.
import type { Flies, Place, Target } from '../api/questionnaire'

export type AnswerKey = 'experience' | 'place' | 'trout' | 'onlyRod' | 'target' | 'flies' | 'budget'
export type Draft = Partial<Record<AnswerKey, string>>

export interface QuestionOption {
  value: string
  label: string
  description?: string
  comingSoon?: boolean // shown, but can't be picked yet
}

export interface Question {
  id: AnswerKey
  title: string
  reaction?: string // shown above the title, reacting to the previous answer
  options: QuestionOption[]
}

const SHARED_QUESTIONS: Question[] = [
  {
    id: 'experience',
    title: 'What is your experience level?',
    options: [
      { value: 'low', label: 'Low', description: "You've never cast a fly rod, or only a few times." },
      { value: 'medium', label: 'Medium', description: "You've fished a few seasons and are comfortable casting." },
      { value: 'high', label: 'High', description: "You're an experienced caster." },
    ],
  },
  {
    id: 'place',
    title: 'Where do you want to fish?',
    options: [
      { value: 'small_creeks', label: 'Small creeks' },
      { value: 'large_rivers', label: 'Large rivers' },
      { value: 'lakes_ponds', label: 'Lakes and ponds', comingSoon: true },
      { value: 'inland_salt', label: 'Inland saltwater', comingSoon: true },
      { value: 'deep_salt', label: 'Deep saltwater', comingSoon: true },
    ],
  },
]

const BUDGET: Question = {
  id: 'budget',
  reaction: 'Nice.',
  title: 'What is your budget?',
  options: [
    { value: 'low', label: 'Low', description: "You're new to fishing and don't want to spend a lot just to learn." },
    { value: 'medium', label: 'Medium', description: 'This is something you want to invest in more.' },
    { value: 'high', label: 'High', description: "You want the nicest gear possible; you're really into fly fishing." },
  ],
}

const CREEK_QUESTIONS: Question[] = [
  {
    id: 'trout',
    reaction: 'Nice choice, small creeks are so much fun and typically have the prettiest fish.',
    title: 'Are you targeting trout?',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    id: 'onlyRod',
    reaction: 'Awesome!',
    title: "Is this the only place you'll use this rod?",
    options: [
      { value: 'true', label: 'Yes, only small creeks' },
      { value: 'false', label: "No, I'll fish other water too" },
    ],
  },
]

const TARGET: Question = {
  id: 'target',
  reaction: 'Big water, big fish.',
  title: 'What are you targeting?',
  options: [
    { value: 'trout', label: 'Trout' },
    { value: 'smallmouth', label: 'Smallmouth bass' },
    { value: 'predators', label: 'Musky and other large predators' },
  ],
}

const FLIES_LABELS: Record<Flies, string> = {
  dries_nymphs: 'Dries and nymphs',
  small_streamers: 'Small to medium streamers',
  large_streamers: 'Large streamers',
  large_topwater: 'Large streamers and heavy topwater',
  unweighted: 'Unweighted streamers',
  weighted: 'Heavily weighted streamers',
  both: 'Some of both',
}

// Matches FLIES_BY_TARGET in api/app/questionnaire/rules/rivers.py
export const FLIES_BY_TARGET: Record<Target, Flies[]> = {
  trout: ['dries_nymphs', 'small_streamers', 'large_streamers'],
  smallmouth: ['small_streamers', 'large_topwater'],
  predators: ['unweighted', 'weighted', 'both'],
}

function fliesQuestion(target: Target): Question {
  return {
    id: 'flies',
    reaction: 'Good pick.',
    title: 'What will you mostly be throwing?',
    options: FLIES_BY_TARGET[target].map((flies) => ({ value: flies, label: FLIES_LABELS[flies] })),
  }
}

function followUps(draft: Draft): Question[] {
  if ((draft.place as Place | undefined) === 'large_rivers') {
    return [TARGET, fliesQuestion((draft.target as Target | undefined) ?? 'trout')]
  }
  return CREEK_QUESTIONS
}

/** The five questions for the answers so far; the follow-ups depend on the place
 * (and, for large rivers, the flies on the target). */
export function questionsFor(draft: Draft): Question[] {
  return [...SHARED_QUESTIONS, ...followUps(draft), BUDGET]
}
