import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@components/ui/popover'

const COPIED_MS = 2000

export function ShareButton({
  path,
  title,
  size = 'sm',
}: {
  path: string
  title: string
  size?: 'sm' | 'default'
}) {
  const [copied, setCopied] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const url = new URL(path, window.location.origin).href

  function showCopied() {
    clearTimeout(timer.current)
    setCopied(true)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  async function handleClick() {
    const useSheet =
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ url }) &&
      window.matchMedia('(pointer: coarse)').matches
    if (useSheet) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setManualOpen(false)
      showCopied()
    } catch {
      setManualOpen(true)
    }
  }

  return (
    <Popover open={manualOpen} onOpenChange={setManualOpen}>
      <PopoverAnchor asChild>
        <Button variant="secondary" size={size === 'default' ? 'md' : size} onClick={handleClick}>
          <Share2 aria-hidden="true" />
          {copied ? 'Link copied' : 'Share'}
        </Button>
      </PopoverAnchor>
      <span role="status" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
      <PopoverContent>
        <input
          aria-label="Link"
          readOnly
          autoFocus
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-hairline bg-stone-page px-2 py-1.5 text-sm text-ink"
        />
        <p className="mt-2 text-xs text-ink-2">Copy this link</p>
      </PopoverContent>
    </Popover>
  )
}
