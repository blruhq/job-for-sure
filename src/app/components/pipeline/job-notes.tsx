'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useUpdateApplication } from '~/hooks/use-apps'
import { notify } from '~/lib/toast'
import { Textarea } from '~/components/ui/textarea'

// ═══════════════════════════════════════════════════════════════
// JobNotes — auto-saving textarea for application notes.
// Saves via PATCH /api/applications/[id] after a debounce.
// ═══════════════════════════════════════════════════════════════

interface JobNotesProps {
  applicationId: string
  initialNotes?: string
}

export function JobNotes({ applicationId, initialNotes }: JobNotesProps) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { mutateAsync: updateApp } = useUpdateApplication()

  // Sync when initialNotes changes (e.g., switching jobs)
  useEffect(() => {
    setNotes(initialNotes || '')
  }, [initialNotes])

  const handleChange = (value: string) => {
    setNotes(value)

    // Clear previous debounce timer
    if (timerRef.current) clearTimeout(timerRef.current)

    // Auto-save after 800ms of inactivity
    timerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await updateApp({ id: applicationId, notes: value || '' })
      } catch (err) {
        console.error(err)
        notify({ message: 'Failed to save notes', type: 'error' })
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div>
      <div className="label-mono mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <FileText size={11} /> Notes
        </div>
        {saving && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 size={9} className="animate-spin" /> Saving…
          </span>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add notes about this application…"
        rows={3}
        className="w-full resize-none rounded-xs border-border bg-background px-2 py-1.5 text-[11px] focus:border-primary placeholder:text-muted-foreground/50"
      />
    </div>
  )
}
