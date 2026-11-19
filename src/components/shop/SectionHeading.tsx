import type { ReactNode } from 'react'

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[28px] leading-9 font-medium text-olive">
      {children}
    </h2>
  )
}
