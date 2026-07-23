'use client'

import { useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { useResumes, useDeleteResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { UploadModal } from '~/components/layout/upload-modal'
import { notify } from '~/lib/toast'
import { cn } from '~/lib/utils'
import { Plus, FileText, Trash2, ExternalLink, Clock, Zap } from 'lucide-react'
import { Button } from '~/components/ui/button'
import type { Resume } from '~/types/resume'

export default function ResumesPage() {
  const router = useRouter()
  const { data: resumes = [], isLoading } = useResumes()
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const { mutateAsync: deleteResume } = useDeleteResume()

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const baseResumes = resumes.filter((r) => !r.isVariant)
  const variantsByBase: Record<string, Resume[]> = {}
  for (const r of resumes) {
    if (r.isVariant && r.baseResumeId) {
      if (!variantsByBase[r.baseResumeId]) variantsByBase[r.baseResumeId] = []
      variantsByBase[r.baseResumeId].push(r)
    }
  }

  const handleOpen = (id: string) => {
    setActiveResumeId(id)
    router.push(`/resume/${id}`)
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return '' }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Page header */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ 02 // RESUME COLLECTION ]</div>
            <h1 className="text-lg font-semibold text-foreground">My Resumes</h1>
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-sm text-sm font-semibold active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Resume
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-sm border border-border bg-card" />
            ))}
          </div>
        )}

        {!isLoading && baseResumes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-sm border border-dashed border-border bg-grid-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-card">
              <FileText size={24} className="text-muted-foreground" />
            </div>
            <div>
              <div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ STATUS: EMPTY ]</div>
              <p className="text-sm text-muted-foreground">No resumes yet. Upload or create your first one.</p>
            </div>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-sm text-sm font-semibold"
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Resume
            </Button>
          </div>
        )}

        {!isLoading && baseResumes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {baseResumes.map((resume) => {
              const variants = variantsByBase[resume.id] || []
              return (
                <div
                  key={resume.id}
                  className="group relative flex flex-col rounded-lg border border-border bg-card shadow-sm transition-all hover:border-foreground/15 hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-primary" />
                        <span className="truncate text-sm font-semibold text-foreground">{resume.name}</span>
                      </div>
                      {resume.role && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{resume.role}</p>
                      )}
                    </div>
                    {/* Score badge */}
                    {typeof resume.score === 'number' && resume.score > 0 && (
                      <span
                        className={cn(
                          'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold',
                          resume.score >= 75
                            ? 'bg-success-soft text-success'
                            : resume.score >= 50
                              ? 'bg-warn-soft text-[var(--warn)]'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {resume.score}%
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex-1 px-4 py-3">
                    {/* Variants count */}
                    {variants.length > 0 && (
                      <div className="mb-2">
                        <span className="label-mono text-muted-foreground">
                          {variants.length} tailored variant{variants.length > 1 ? 's' : ''}
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {variants.slice(0, 2).map((v) => (
                            <Button
                              key={v.id}
                              variant="ghost"
                              onClick={() => handleOpen(v.id)}
                              className="flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-primary h-auto p-0 w-full justify-start"
                            >
                              <span className="text-[9px]">└</span>
                              <span className="truncate">{v.variantLabel || v.name}</span>
                              {v.score > 0 && (
                                <span className="ml-auto font-mono text-[10px] text-success shrink-0">{v.score}%</span>
                              )}
                            </Button>
                          ))}
                          {variants.length > 2 && (
                            <span className="text-xs text-muted-foreground pl-3">+{variants.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Updated date */}
                    {resume.updated && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={10} />
                        <span>Updated {formatDate(resume.updated)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card footer — actions */}
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <Button
                      onClick={() => handleOpen(resume.id)}
                      size="sm"
                      className="flex items-center gap-1.5 rounded-xs text-xs font-semibold active:scale-[0.98]"
                    >
                      <ExternalLink size={11} />
                      Open
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => handleOpen(resume.id)}
                        size="sm"
                        className="flex items-center gap-1 rounded-xs text-xs text-muted-foreground hover:bg-accent-soft hover:text-primary"
                        title="Tailor this resume"
                      >
                        <Zap size={11} />
                        Tailor
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ id: resume.id, name: resume.name })}
                        className="rounded-xs p-1.5 h-auto w-auto text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                        title="Delete resume"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* "+ New Resume" card */}
            <Button
              variant="ghost"
              onClick={() => setUploadModalOpen(true)}
              className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-card/50 text-muted-foreground hover:border-primary/50 hover:bg-accent-soft hover:text-primary h-auto"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background">
                <Plus size={18} strokeWidth={2} />
              </div>
              <span className="text-sm font-medium">New Resume</span>
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await deleteResume(deleteTarget.id)
            notify({ message: `"${deleteTarget.name}" deleted`, type: 'success' })
            setDeleteTarget(null)
          } catch {
            notify({ message: 'Failed to delete resume', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Resume?"
        description={`Remove "${deleteTarget?.name}" from your list? You can re-upload it anytime.`}
        confirmLabel="Delete Resume"
        variant="danger"
        loading={deleting}
      />

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  )
}
