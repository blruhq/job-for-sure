'use client'

import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'

interface PasteJDModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (jdText: string) => void
}

export function PasteJDModal({ open, onClose, onSubmit }: PasteJDModalProps) {
  const [jdText, setJdText] = useState('')

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-primary" />
              <span>Paste Job Description</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div>
          <p className="mb-3 text-xs text-muted-foreground">
            Paste a job description and I'll analyze it against your resume to find the match score and missing keywords.
          </p>
          <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="w-full resize-y rounded-md px-3 py-2.5 text-sm leading-relaxed"
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="rounded-md px-3 py-1.5 text-xs">
            Cancel
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={jdText.trim().length < 50} className="rounded-md px-4 py-1.5 text-xs">
            Analyze Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
