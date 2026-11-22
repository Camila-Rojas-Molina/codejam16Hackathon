// A modal built on the native <dialog>: the browser traps focus, makes the page behind inert and
// closes on Esc. We only sync it with React state and hand focus back to where it came from.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'

type ModalProps = {
  open: boolean
  onClose: () => void
  /** id of the element that names the dialog. */
  labelledBy: string
  describedBy?: string
  className?: string
  /** Close when the backdrop (outside the content) is clicked. */
  closeOnBackdrop?: boolean
  onKeyDown?: (e: KeyboardEvent<HTMLDialogElement>) => void
  children: ReactNode
}

export default function Modal({ open, onClose, labelledBy, describedBy, className, closeOnBackdrop = true, onKeyDown, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Hand focus back when the dialog goes away (closed, or unmounted while open).
  useEffect(() => {
    if (open) return
    const el = returnFocus.current
    returnFocus.current = null
    if (el?.isConnected) el.focus()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Esc: let React state close it, so the two never disagree.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
      className={cn('text-ink backdrop:bg-ink/75 open:animate-step-in', className)}
    >
      {open && children}
    </dialog>
  )
}
