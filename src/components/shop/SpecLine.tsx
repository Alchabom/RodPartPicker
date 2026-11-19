export function SpecLine({ specs }: { specs: (string | number | null | undefined)[] }) {
  const present = specs.filter((s) => s !== null && s !== undefined && s !== '')
  if (present.length === 0) return null
  return <p className="text-[13px] text-ink-3 tabular-nums">{present.join(' · ')}</p>
}
