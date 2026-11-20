import type { ComponentProps } from 'react'
import { PartImage } from '@components/shop'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface PartPhotoButtonProps {
  src: string | null
  name: string // "Lamson Liquid S"
  label: ComponentProps<typeof PartImage>['label']
}

/** A part's thumbnail that opens the photo full size. Esc, the close button
 *  or a click outside the photo closes it again. */
export function PartPhotoButton({ src, name, label }: PartPhotoButtonProps) {
  const thumb = <PartImage src={src} alt="" label={label} className="h-18 w-24" />

  // A placeholder has nothing to enlarge
  if (!src) return thumb

  return (
    <Dialog>
      <DialogTrigger
        aria-label={`Enlarge photo of ${name}`}
        className="block cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {thumb}
      </DialogTrigger>
      <DialogContent className="w-auto sm:max-w-[min(832px,calc(100%-2rem))]">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription className="sr-only">Product photo. Press Escape or click outside to close.</DialogDescription>
        <PartImage
          src={src}
          alt={name}
          label={label}
          className="aspect-[4/3] w-[800px] max-w-full max-h-[calc(100svh-8rem)] object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
