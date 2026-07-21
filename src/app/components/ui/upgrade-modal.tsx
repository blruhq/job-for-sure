'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import { Sparkles, X } from 'lucide-react'

export type UpgradeModalData = {
  /** Which feature hit the limit, e.g. 'chat', 'resume_create' */
  feature?: string
  /** The numeric limit that was reached, e.g. 15 (chat/day) or 3 (resumes) */
  limit?: number
  /** Human-readable label for what was limited, e.g. "chat messages" */
  featureLabel?: string
  /** Period of the limit, e.g. "today", "per week", "total" */
  period?: string
}

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  data?: UpgradeModalData
}

/**
 * Reusable upgrade prompt modal. Shown when a Free-plan user hits a feature
 * limit (chat, resume_create, cover_letter, ats_match, interview).
 *
 * Routes to /pricing (public plans page) or /settings/billing (existing
 * subscribers can manage/cancel).
 */
export function UpgradeModal({ open, onClose, data }: UpgradeModalProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a:not([disabled])',
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
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
    }, 0)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      window.clearTimeout(id)
      previouslyFocused.current?.focus?.()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const featureLabel = data?.featureLabel ?? 'features'
  const limit = data?.limit
  const period = data?.period ?? 'today'

  const limitText = limit
    ? `You've used all ${limit} free ${featureLabel} ${period}.`
    : `You've reached the free plan limit for ${featureLabel}.`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div className="px-6 py-7 text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles size={22} className="text-primary" />
          </div>

          {/* Title */}
          <h3 id="upgrade-modal-title" className="text-base font-semibold text-foreground">
            {limit ? 'Limit Reached' : 'Upgrade to Continue'}
          </h3>

          {/* Limit description */}
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {limitText}
          </p>

          {/* Pro pitch */}
          <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">Upgrade to Pro</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Unlimited chat, resumes, cover letters, ATS matching, and interview prep.
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              $4<span className="text-xs font-normal text-muted-foreground">/mo</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">or $29/year</span>
            </p>
          </div>

          {/* CTA buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => {
                onClose()
                router.push('/pricing')
              }}
              className="w-full cursor-pointer rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View Plans
            </button>
            <button
              onClick={() => {
                onClose()
                router.push('/settings/billing')
              }}
              className="w-full cursor-pointer rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Go to Billing Settings
            </button>
            <button
              onClick={onClose}
              className="mt-1 w-full cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
