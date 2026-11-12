import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getRecommendation, type Answers, type Level } from '../api/questionnaire'
import { useBuild } from '../hooks/useBuild'
import { QUESTIONS } from '../utils/questions'

type Draft = Partial<Record<keyof Answers, string>>

// Option values are strings; this is the one place they become typed answers
function toAnswers(draft: Draft): Answers {
  return {
    experience: draft.experience as Level,
    place: 'small_creeks',
    trout: draft.trout === 'true',
    onlyRod: draft.onlyRod === 'true',
    budget: draft.budget as Level,
  }
}

export function QuestionnaireDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Radix unmounts the content when closed, so every open starts at question 1 */}
        <QuestionnaireSteps onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function QuestionnaireSteps({ onDone }: { onDone: () => void }) {
  const { loadRecommendation } = useBuild()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>({})
  const [status, setStatus] = useState<'asking' | 'loading' | 'error'>('asking')
  const request = useRef<AbortController>(null)

  // Closing the dialog unmounts this, which cancels a pending request
  useEffect(() => () => request.current?.abort(), [])

  const submit = (answers: Answers) => {
    setStatus('loading')
    const controller = new AbortController()
    request.current = controller
    getRecommendation(answers, controller.signal)
      .then((parts) => {
        loadRecommendation(parts)
        onDone()
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error('Could not get a recommendation', error)
        setStatus('error')
      })
  }

  const answer = (value: string) => {
    const next = { ...draft, [QUESTIONS[step].id]: value }
    setDraft(next)
    if (step < QUESTIONS.length - 1) setStep(step + 1)
    else submit(toAnswers(next))
  }

  if (status === 'error') {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Couldn't get a recommendation</DialogTitle>
          <DialogDescription>Something went wrong on our end. Your answers are saved, so you can try again.</DialogDescription>
        </DialogHeader>
        <Button onClick={() => submit(toAnswers(draft))}>Try again</Button>
      </>
    )
  }

  if (status === 'loading') {
    return (
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LoaderCircle className="animate-spin" aria-hidden /> Building your setup…
        </DialogTitle>
        <DialogDescription>Picking a rod, reel, line, leader and tippet for you.</DialogDescription>
      </DialogHeader>
    )
  }

  const question = QUESTIONS[step]
  return (
    <>
      <DialogHeader>
        <p className="text-xs text-muted-foreground">
          {step + 1} of {QUESTIONS.length}
        </p>
        {question.reaction && <DialogDescription>{question.reaction}</DialogDescription>}
        <DialogTitle className="text-lg">{question.title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            disabled={option.comingSoon}
            onClick={() => answer(option.value)}
            className="h-auto flex-col items-start gap-0.5 py-2.5 text-left whitespace-normal"
          >
            <span className="flex w-full items-center justify-between gap-2">
              {option.label}
              {option.comingSoon && <Badge variant="secondary">Coming soon</Badge>}
            </span>
            {option.description && (
              <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
            )}
          </Button>
        ))}
      </div>

      {step > 0 && (
        <Button variant="ghost" className="justify-self-start" onClick={() => setStep(step - 1)}>
          <ArrowLeft data-icon="inline-start" /> Back
        </Button>
      )}
    </>
  )
}
