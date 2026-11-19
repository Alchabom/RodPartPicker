export function FitSpot({ decorative, label }: { decorative?: boolean; label?: string }) {
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label ?? 'Fits your build' } as const)
  return (
    <span
      {...a11y}
      className="inline-block size-2 shrink-0 rounded-full bg-spot"
      style={{ boxShadow: '0 0 0 3px var(--halo)' }}
    />
  )
}
