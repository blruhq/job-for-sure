'use client'

import { useState } from 'react'
import { X, ClipboardList } from 'lucide-react'

interface PasteJDModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (jdText: string) => void
}

export function PasteJDModal({ open, onClose, onSubmit }: PasteJDModalProps) {
  const [jdText, setJdText] = useState('')

  if (!open) return null

  const handleClose = () => {
    setJdText('')
    onClose()
  }

  const handleSubmit = () => {
    if (jdText.trim().length < 50) return
    onSubmit(jdText.trim())
    setJdText('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Paste Job Description</span>
          </div>
          <button onClick={handleClose} className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Paste a job description and I'll analyze it against your resume to find the match score and missing keywords.
          </p>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-primary"
            autoFocus
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">
              {jdText.length} characters
            </span>
            {jdText.length > 0 && jdText.length < 50 && (
              <span className="font-mono text-[10px] text-[var(--warn)]">
                Need at least 50 characters
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={jdText.trim().length < 50}
            className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze Match
          </button>
        </div>
      </div>
    </div>
  )
}
