import { useState } from 'react'

interface PartImageProps {
  src: string | null
  alt: string
  label: 'Rod' | 'Reel' | 'Line' | 'Leader' | 'Tippet'
  className?: string
}

export function PartImage({ src, alt, label, className = '' }: PartImageProps) {
  const [failed, setFailed] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)
  // Reset the failure flag when the image changes (derived state, no effect)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setFailed(false)
  }

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`flex items-center justify-center rounded-md border border-dashed border-hairline text-sm text-ink-3 ${className}`}
      >
        {label}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={400}
      height={300}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`rounded-md bg-white object-contain ${className}`}
    />
  )
}
