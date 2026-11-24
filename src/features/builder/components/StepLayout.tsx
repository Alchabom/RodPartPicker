import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useBuild } from '../hooks/useBuild'
import type { Brand, ComponentType } from '../types'
import { BrandRail } from './BrandRail'
import { BuildHeader } from './BuildHeader'
import { QuestionnaireDialog } from './QuestionnaireDialog'
import { RigColumn } from './RigColumn'

interface StepLayoutProps {
  current: ComponentType
  title: string
  subtitle?: ReactNode // under the title: what the step is matched to, or why it opened
  brands: Brand[]
  brand: string
  children: ReactNode
}

/**
 * The frame every guided-builder step shares: your rig and the brand filter
 * down the left, the step's title and Help me choose on one line, then the parts.
 */
export function StepLayout({ current, title, subtitle, brands, brand, children }: StepLayoutProps) {
  const { basePath } = useBuild()
  const navigate = useNavigate()
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-28 lg:pb-12">
      <BuildHeader />
      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:gap-6">
          <RigColumn current={current} />
          <BrandRail brands={brands} current={brand} />
        </aside>

        <div className="mt-6 min-w-0 lg:mt-0">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="text-[28px] font-medium text-olive">{title}</h1>
              {subtitle}
            </div>
            <p className="flex items-center gap-2 text-sm text-ink-2">
              Not sure?
              <Button size="sm" onClick={() => setQuestionnaireOpen(true)}>
                Help me choose
              </Button>
            </p>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <QuestionnaireDialog
        open={questionnaireOpen}
        onOpenChange={setQuestionnaireOpen}
        onRigged={() => navigate(basePath)}
      />
    </main>
  )
}
