'use client'

import { useState, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import { useUIStore } from '~/hooks/use-ui'
import { useCreateResume } from '~/hooks/use-resumes'
import { createResume } from '~/lib/company-data'
import { normalizeParsed, type ParsedResumeFields } from '~/lib/resume-normalize'
import { notify } from '~/lib/toast'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { cn } from '~/lib/utils'

interface UploadModalProps {
  open: boolean
  onClose: () => void
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const router = useRouter()
  const { mutate: addResume } = useCreateResume()
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  if (!open) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      notify({ message: 'File too large. Maximum size is 5MB.', type: 'error' })
      return
    }

    setParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to parse resume')
      }

      const parsed = (await res.json()) as ParsedResumeFields

      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        ...normalizeParsed(parsed),
      })

      addResume({ id: resume.id, data: resume })
      setActiveResumeId(resume.id)

      notify({ message: 'Resume uploaded!', type: 'success' })
      onClose()

      router.push(`/resume/${resume.id}`)
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume.', type: 'error' })
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileRef.current) {
        fileRef.current.files = dt.files
        fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  const handleWizardComplete = (data: WizardData) => {
    sessionStorage.setItem('jfs-build-data', JSON.stringify(data))
    sessionStorage.removeItem('jfs-chat-messages')
    setWizardOpen(false)
    onClose()
    if (typeof window !== 'undefined' && window.location.pathname.includes('/chat')) {
      window.location.reload()
    } else {
      router.push('/chat')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => !parsing && onClose()}
      >
        <div
          className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-sm font-semibold text-foreground">Add a Resume</span>
            <button
              onClick={() => !parsing && onClose()}
              className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted"
              disabled={parsing}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Drag & drop zone */}
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={parsing}
              className={cn(
                'w-full cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30',
                parsing && 'opacity-60 cursor-not-allowed',
              )}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">Parsing your resume…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary">
                    <Upload size={18} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Drop your file here or click to browse</span>
                  <span className="text-[11px] text-muted-foreground">PDF · DOCX · TXT · MD (max 5MB)</span>
                </div>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-mono text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Build with AI button */}
            <button
              onClick={() => setWizardOpen(true)}
              disabled={parsing}
              className="w-full cursor-pointer flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Build with AI</div>
                <div className="text-[11px] text-muted-foreground">Answer questions · Takes 5 min</div>
              </div>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.text,.pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Build Wizard */}
      <BuildWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
    </>
  )
}
