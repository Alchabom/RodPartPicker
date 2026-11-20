import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PartPhotoButton } from './PartPhotoButton'

describe('PartPhotoButton', () => {
  it('opens a larger photo with the part name, and Esc closes it', async () => {
    render(<PartPhotoButton src="/parts/reels/lamson-liquid-s.webp" name="Lamson Liquid S" label="Reel" />)

    const thumb = screen.getByRole('button', { name: 'Enlarge photo of Lamson Liquid S' })
    await userEvent.click(thumb)

    const dialog = screen.getByRole('dialog', { name: 'Lamson Liquid S' })
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/parts/reels/lamson-liquid-s.webp')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(thumb).toHaveFocus()
  })

  it('closes when you click outside the photo', async () => {
    render(<PartPhotoButton src="/parts/reels/x.webp" name="Lamson Guru X" label="Reel" />)
    await userEvent.click(screen.getByRole('button', { name: 'Enlarge photo of Lamson Guru X' }))

    // The overlay covers everything outside the dialog
    await userEvent.click(document.querySelector('[data-slot="dialog-overlay"]')!)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes from the close button', async () => {
    render(<PartPhotoButton src="/parts/reels/x.webp" name="Lamson Guru X" label="Reel" />)
    await userEvent.click(screen.getByRole('button', { name: 'Enlarge photo of Lamson Guru X' }))

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows a plain placeholder, not a button, without a photo', () => {
    render(<PartPhotoButton src={null} name="Orvis Ratio" label="Reel" />)

    expect(screen.getByRole('img', { name: 'Reel' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
