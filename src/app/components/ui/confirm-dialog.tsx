'use client'

import { useEffect, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
        return
      }
      if (e.key === 'Enter' && !loading) {
        onConfirm()
        return
      }
      // Focus trap — keep Tab cycling inside the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose, onConfirm, loading],
  )

  useEffect(() => {
    if (open) {
      // Remember the element that had focus before we opened
      previouslyFocused.current = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Move focus into the dialog
      const id = window.setTimeout(() => {
        const first = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')
        if (first) {
          first.focus()
        } else {
          dialogRef.current?.focus()
        }
      }, 0)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
        window.clearTimeout(id)
        // Restore focus to the trigger
        previouslyFocused.current?.focus?.()
      }
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        className="w-full max-w-sm rounded-lg border border-border bg-card shadow-lg outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border px-5 py-3.5">
          <h3 id="confirm-dialog-title" className="text-sm font-semibold text-foreground">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p id="confirm-dialog-desc" className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`cursor-pointer rounded-sm px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5 ${
              isDanger ? 'bg-red-600' : 'bg-primary'
            }`}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
