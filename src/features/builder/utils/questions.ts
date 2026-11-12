// The questionnaire's wording, as data, so editing it doesn't touch the dialog.
// Each option's value becomes that question's answer (see QuestionnaireDialog).
import type { Answers } from '../api/questionnaire'

export interface QuestionOption {
  value: string
  label: string
  description?: string
  comingSoon?: boolean // shown, but can't be picked yet
}

export interface Question {
  id: keyof Answers
  title: string
  reaction?: string // shown above the title, reacting to the previous answer
  options: QuestionOption[]
}

export const QUESTIONS: Question[] = [
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
      { value: 'large_rivers', label: 'Large rivers', comingSoon: true },
      { value: 'lakes_ponds', label: 'Lakes and ponds', comingSoon: true },
      { value: 'inland_salt', label: 'Inland saltwater', comingSoon: true },
      { value: 'deep_salt', label: 'Deep saltwater', comingSoon: true },
    ],
  },
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
  {
    id: 'budget',
    reaction: 'Nice.',
    title: 'What is your budget?',
    options: [
      { value: 'low', label: 'Low', description: "You're new to fishing and don't want to spend a lot just to learn." },
      { value: 'medium', label: 'Medium', description: 'This is something you want to invest in more.' },
      { value: 'high', label: 'High', description: "You want the nicest gear possible; you're really into fly fishing." },
    ],
  },
]
