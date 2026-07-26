import { useState, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useUIStore } from '~/hooks/use-ui'
import { useCreateResume } from '~/hooks/use-resumes'
import { createResume } from '~/lib/company-data'
import { normalizeParsed, type ParsedResumeFields } from '~/lib/resume-normalize'
import { notify } from '~/lib/toast'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

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
      <Dialog open={open} onOpenChange={(o) => { if (!o && !parsing) onClose() }}>
        <DialogContent className="neuro-modal max-w-lg rounded-lg ring-0">
          <DialogHeader>
            <DialogTitle>Add a Resume</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Drag & drop zone */}
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={parsing}
              className={cn(
                'neuro-inset w-full rounded-lg border-0 p-10 text-center',
                dragOver && 'ring-2 ring-primary',
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
                  <div className="neuro-icon-well flex h-10 w-10 items-center justify-center rounded-full text-primary">
                    <Upload size={18} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Drop your file here or click to browse</span>
                  <span className="text-xs text-muted-foreground">PDF · DOCX · TXT · MD (max 5MB)</span>
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-mono text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Build with AI button */}
            <Button
              variant="ghost"
              onClick={() => setWizardOpen(true)}
              disabled={parsing}
              className="neuro-card w-full flex items-center gap-3 rounded-lg border-0 p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              <div className="neuro-icon-well flex h-10 w-10 items-center justify-center rounded-full text-success shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Build with AI</div>
                <div className="text-xs text-muted-foreground">Answer questions · Takes 5 min</div>
              </div>
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.text,.pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </DialogContent>
      </Dialog>

      {/* Build Wizard */}
      <BuildWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
    </>
  )
}
