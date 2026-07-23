'use client'

import { useState, useRef } from 'react'
import { Trash2, Link2, RefreshCw, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { cn } from '~/lib/utils'
import { useApplications, useMoveApplication, useDeleteApplication, useCreateApplication } from '~/hooks/use-apps'
import { JobDetailPanel } from '~/components/pipeline/job-detail-panel'
import { useResumes } from '~/hooks/use-resumes'
import { notify } from '~/lib/toast'
import { useTranslations } from 'next-intl'
import type { ApplicationColumnId, PipelineJob } from '~/types/resume'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  pointerWithin,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Date formatting helper ──
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `Added ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

const COLUMN_IDS: ApplicationColumnId[] = ['bookmark', 'applied', 'interviewing', 'offers', 'rejected']

// ── Collision detection: pointerWithin first (responsive column entry),
//    fall back to closestCorners for card-level precision ──
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return closestCorners(args)
}

const COLUMNS: { id: ApplicationColumnId; labelKey: string; dot: string; next: ApplicationColumnId | null }[] = [
  { id: 'bookmark', labelKey: 'bookmark', dot: '#9F9E98', next: 'applied' },
  { id: 'applied', labelKey: 'applied', dot: '#5B6ABF', next: 'interviewing' },
  { id: 'interviewing', labelKey: 'interviewing', dot: '#D4A316', next: 'offers' },
  { id: 'offers', labelKey: 'offers', dot: '#2B5F45', next: 'rejected' },
  { id: 'rejected', labelKey: 'rejected', dot: '#B53A3A', next: null },
]

// ── Sortable job card wrapper (draggable + droppable within column) ──
function DraggableJobCard({ job, children }: { job: PipelineJob; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.key,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-sm border border-border/60 bg-card p-2.5 active:cursor-grabbing hover:border-primary/50',
      )}
    >
      {children}
    </div>
  )
}

// ── Droppable column wrapper ──
function DroppableColumn({ colId, isOver, children }: { colId: ApplicationColumnId; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: colId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-sm border border-border transition-colors',
        isOver && 'border-primary bg-accent-soft/30',
      )}
    >
      {children}
    </div>
  )
}

// ── Card content (used in both card and overlay) ──
function JobCardContent({ job }: { job: PipelineJob }) {
  const dateText = job.addedAt ? formatDate(job.addedAt) : ''
  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-foreground truncate">{job.title}</div>
          <div className="text-[10px] text-muted-foreground truncate">{job.company}</div>
        </div>
        {job.score > 0 && (
          <span className={cn(
            'shrink-0 rounded-xs px-1 py-px text-[9px] font-mono font-semibold',
            job.score >= 85 ? 'bg-success/10 text-success' : job.score >= 70 ? 'bg-primary/10 text-primary' : 'bg-warn/10 text-warn'
          )}>
            {job.score}%
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
        {job.loc && <span className="truncate">{job.loc}</span>}
      </div>
      {dateText && (
        <div className="mt-1 text-[9px] text-muted-foreground/60">
          {dateText}
        </div>
      )}
    </>
  )
}

// ── Inline add form for a column ──
// NOTE: This component MUST be defined at module scope, not inside
// ApplicationsView. Defining it inside the parent makes React see a new
// component type on every render and unmounts/remounts the input tree,
// which causes focus loss after every keystroke.
interface InlineAddFormProps {
  colId: ApplicationColumnId
  onCancel: () => void
  onSave: (payload: {
    sourceKey: string
    company: string
    jobTitle: string
    location: string
    status: 'bookmarked'
  }) => void
  titleRef: React.RefObject<HTMLInputElement | null>
}

function InlineAddForm({ colId: _colId, onCancel, onSave, titleRef }: InlineAddFormProps) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [loc, setLoc] = useState('')
  const t = useTranslations('applications')

  const handleSave = () => {
    const trimmedTitle = title.trim()
    const trimmedCompany = company.trim()
    if (!trimmedTitle || !trimmedCompany) {
      notify({ message: 'Job title and company are required.', type: 'error' })
      return
    }

    onSave({
      sourceKey: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      company: trimmedCompany,
      jobTitle: trimmedTitle,
      location: loc.trim(),
      status: 'bookmarked',
    })

    notify({ message: `Added "${trimmedTitle}" at ${trimmedCompany}`, type: 'success' })
    onCancel()
  }

  return (
    <div className="mt-1.5 flex flex-col gap-2 rounded-xs border border-border bg-card p-2.5">
      <Input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Job title *"
        autoFocus
        className="w-full rounded-xs px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/50"
      />
      <Input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Company *"
        className="w-full rounded-xs px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/50"
      />
      <Input
        value={loc}
        onChange={(e) => setLoc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Location"
        className="w-full rounded-xs px-2 py-1.5 text-[11px] placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center justify-end gap-1.5 mt-0.5">
        <Button variant="ghost" onClick={onCancel} className="rounded-xs px-2.5 py-1 text-[10px]">
          {t('cancel')}
        </Button>
        <Button variant="default" onClick={handleSave} disabled={!title.trim() || !company.trim()} className="rounded-xs px-2.5 py-1 text-[10px]">
          {t('add')}
        </Button>
      </div>
    </div>
  )
}

export function ApplicationsView() {
  const t = useTranslations('applications')
  const { data: applications, isLoading, isError, error } = useApplications()
  const { mutateAsync: moveJob } = useMoveApplication()
  const { mutateAsync: removeJobMutation } = useDeleteApplication()
  const { mutateAsync: bookmarkJob } = useCreateApplication()
  const { data: resumes = [] } = useResumes()

  const removeJob = (jobKey: string) => {
    const allJobs = [...(applications?.bookmark ?? []), ...(applications?.applied ?? []), ...(applications?.interviewing ?? []), ...(applications?.offers ?? []), ...(applications?.rejected ?? [])]
    const job = allJobs.find((j) => j.key === jobKey)
    if (job?.applicationId) removeJobMutation(job.applicationId)
  }

  const [filter, setFilter] = useState('all')
  const [dragOverCol, setDragOverCol] = useState<ApplicationColumnId | null>(null)
  const [activeJob, setActiveJob] = useState<PipelineJob | null>(null)
  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)
  const [pasteUrl, setPasteUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [addingToCol, setAddingToCol] = useState<ApplicationColumnId | null>(null)
  const addTitleRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // ── All jobs for filter ──
  const allJobs = [...(applications?.bookmark ?? []), ...(applications?.applied ?? []), ...(applications?.interviewing ?? []), ...(applications?.offers ?? []), ...(applications?.rejected ?? [])]
  const resumeIds = ['all', ...new Set(allJobs.map((j) => j.resume).filter(Boolean))]

  const filterJobs = (jobs: PipelineJob[]) => filter === 'all' ? jobs : jobs.filter((j) => j.resume === filter)

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading applications…</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background gap-3 px-6 text-center">
        <AlertCircle size={24} className="text-destructive/60" />
        <div className="max-w-xs">
          <p className="text-sm font-medium text-foreground">Failed to load applications</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <Button variant="default" onClick={() => window.location.reload()} className="rounded-sm px-3 py-1.5 text-xs">
          Reload page
        </Button>
      </div>
    )
  }

  // ── Empty board if applications not loaded ──
  if (!applications) return null

  // ── Stats ──
  const total = allJobs.length

  // ── Find which column a job belongs to ──
  const findJobColumn = (jobKey: string): ApplicationColumnId | null => {
    for (const colId of COLUMN_IDS) {
      if ((applications?.[colId] ?? []).some((j) => j.key === jobKey)) return colId
    }
    return null
  }

  // ── DnD handler ──
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)
    setDragOverCol(null)
    if (!over || !active) return

    const jobKey = active.id as string
    const fromCol = findJobColumn(jobKey)
    if (!fromCol) return

    const overId = over.id as string
    const isColumnId = COLUMN_IDS.includes(overId as ApplicationColumnId)

    let toCol: ApplicationColumnId
    let toIndex: number | undefined

    if (isColumnId) {
      // Dropped on column empty area — insert at top
      toCol = overId as ApplicationColumnId
      toIndex = 0
    } else {
      // Dropped on a job card — insert before that card
      const targetCol = findJobColumn(overId)
      if (!targetCol) return
      toCol = targetCol
      const targetIdx = (applications?.[toCol] ?? []).findIndex((j) => j.key === overId)
      toIndex = targetIdx !== -1 ? targetIdx : 0
    }

    // Skip if dropped back in the same position (no reorder / no move)
    if (fromCol === toCol) {
      const currentIdx = (applications?.[fromCol] ?? []).findIndex((j) => j.key === jobKey)
      // If dropping on itself or the adjacent position that didn't change, skip
      if (toIndex === currentIdx || toIndex === currentIdx + 1) return
    }

    moveJob({ jobKey, fromCol, toCol, toIndex })
    notify({ message: fromCol !== toCol ? `Moved to ${toCol}` : 'Reordered', type: 'success' })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const jobKey = event.active.id as string
    const job = allJobs.find((j) => j.key === jobKey)
    setActiveJob(job ?? null)
  }

  const handlePasteUrl = async () => {
    const url = pasteUrl.trim()
    if (!url) return

    // Basic URL validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      notify({ message: 'Please enter a valid URL', type: 'error' })
      return
    }

    setScraping(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const data = await res.json()

      if (data.success && data.job) {
        bookmarkJob({
          sourceKey: `${parsedUrl.hostname}-${Date.now()}`,
          company: data.job.company || 'Unknown Company',
          jobTitle: data.job.title || 'Unknown Position',
          location: data.job.location || '',
          jobUrl: url,
          status: 'bookmarked',
        })
        notify({ message: `Added "${data.job.title}" at ${data.job.company}`, type: 'success' })
        setPasteUrl('')
      } else {
        // Scrape failed — show helpful error
        notify({
          message: data.error || 'Could not scrape this page. Try pasting the job details manually.',
          type: 'error',
        })
      }
    } catch {
      notify({ message: 'Failed to scrape URL. Please try again.', type: 'error' })
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-foreground">
              {total} {t('bookmark').toLowerCase() === 'bookmark' ? 'Jobs' : 'งาน'}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {t('resume')}
              </span>
              <Select value={filter} onValueChange={(v) => setFilter(v || 'all')}>
                <SelectTrigger className="rounded-xs px-2 py-1 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resumeIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === 'all' ? t('all') : resumes.find((r) => r.id === id)?.name || id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Paste URL input */}
        <div className="flex items-center gap-1.5">
          <Input
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !scraping) handlePasteUrl()
            }}
            placeholder="Paste a job URL (Indeed, Greenhouse, JobsDB...) and press Enter"
            disabled={scraping}
            className="flex-1 rounded-xs px-2.5 py-1.5 text-[11px] placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
          <Button
            variant="default"
            onClick={handlePasteUrl}
            disabled={scraping || !pasteUrl.trim()}
            className="flex shrink-0 items-center gap-1 rounded-xs px-3 py-1.5 text-[11px]"
          >
            {scraping ? (
              <>
                <RefreshCw size={11} className="animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Link2 size={11} />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          // Highlight column during drag
          const overId = e.over?.id as string | undefined
          if (overId) {
            const isColumnId = COLUMN_IDS.includes(overId as ApplicationColumnId)
            if (isColumnId) {
              setDragOverCol(overId as ApplicationColumnId)
            } else {
              // Over a job — find its column
              const col = findJobColumn(overId)
              if (col) setDragOverCol(col)
            }
          }
        }}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {COLUMNS.map((col) => {
            const jobs = filterJobs(applications[col.id])
            const isOver = dragOverCol === col.id

            return (
              <DroppableColumn key={col.id} colId={col.id} isOver={isOver}>
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.dot }} />
                    <span className="text-xs font-semibold text-foreground">{t(col.labelKey)}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{jobs.length}</span>
                  </div>
                </div>

                {/* Job Cards */}
                <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
                  {jobs.length === 0 && !(addingToCol === col.id) && (
                    <div className="px-2 py-6 text-center">
                      <p className="text-[10px] text-muted-foreground/50">
                        {t('noApplications')}
                      </p>
                    </div>
                  )}

                  <SortableContext items={jobs.map((j) => j.key)} strategy={verticalListSortingStrategy}>
                    {jobs.map((job) => (
                      <DraggableJobCard key={job.key} job={job}>
                        <Button variant="ghost" onClick={() => setSelectedJob(job)} className="w-full text-left h-auto p-0 rounded-none">
                          <JobCardContent job={job} />
                        </Button>
                        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {job.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Link2 size={10} /> Open
                            </a>
                          )}
                          <Button variant="ghost" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              removeJob(job.key)
                              notify({ message: 'Removed from board', type: 'info' })
                            }} className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-destructive h-auto">
                            <Trash2 size={10} /> Remove
                          </Button>
                        </div>
                      </DraggableJobCard>
                    ))}
                  </SortableContext>

                  {/* Inline Add Button / Form */}
                  {addingToCol === col.id ? (
                    <InlineAddForm
                      colId={col.id}
                      titleRef={addTitleRef}
                      onCancel={() => setAddingToCol(null)}
                      onSave={(payload) => bookmarkJob(payload)}
                    />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setAddingToCol(col.id)
                        setTimeout(() => addTitleRef.current?.focus(), 50)
                      }} className="flex items-center gap-1 rounded-xs px-2 py-1.5 text-[10px]">
                      <Plus size={12} />
                      Add Job
                    </Button>
                  )}
                </div>
              </DroppableColumn>
            )
          })}
        </div>

        {/* ── Floating drag overlay ── */}
        <DragOverlay dropAnimation={null}>
          {activeJob ? (
            <div className="w-72 rounded-sm border border-border/60 bg-card p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <JobCardContent job={activeJob} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Job Detail Panel */}
      <JobDetailPanel
        job={selectedJob}
        mode="tracker"
        currentStatus={selectedJob ? findJobColumn(selectedJob.key) ?? undefined : undefined}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  )
}
