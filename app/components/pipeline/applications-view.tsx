'use client'

import { useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { Trash2, Link2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { useTranslations } from 'next-intl'
import type { ApplicationBoard, ApplicationColumnId, PipelineJob } from '~/types/resume'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

const COLUMNS: { id: ApplicationColumnId; labelKey: string; dot: string; next: ApplicationColumnId | null }[] = [
  { id: 'bookmark', labelKey: 'bookmark', dot: '#9F9E98', next: 'applied' },
  { id: 'applied', labelKey: 'applied', dot: '#5B6ABF', next: 'interviewing' },
  { id: 'interviewing', labelKey: 'interviewing', dot: '#D4A316', next: 'offers' },
  { id: 'offers', labelKey: 'offers', dot: '#2B5F45', next: null },
]

// ── Draggable job card wrapper ──
function DraggableJobCard({ job, children }: { job: PipelineJob; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.key,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-sm border border-border/60 bg-card p-2.5 transition-all active:cursor-grabbing hover:border-primary/50',
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
    </>
  )
}

export function ApplicationsView() {
  const router = useRouter()
  const t = useTranslations('applications')
  const { applications, moveJob, removeJob, clearApplications } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [dragOverCol, setDragOverCol] = useState<ApplicationColumnId | null>(null)
  const [activeJob, setActiveJob] = useState<PipelineJob | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // ── All jobs for filter ──
  const allJobs = [...applications.bookmark, ...applications.applied, ...applications.interviewing, ...applications.offers]
  const resumeNames = ['all', ...new Set(allJobs.map((j) => j.resume).filter(Boolean))]

  const filterJobs = (jobs: PipelineJob[]) => filter === 'all' ? jobs : jobs.filter((j) => j.resume === filter)

  // ── Stats ──
  const total = allJobs.length
  const avgScore = total > 0 ? Math.round(allJobs.reduce((s, j) => s + j.score, 0) / total) : 0

  // ── Find which column a job belongs to ──
  const findJobColumn = (jobKey: string): ApplicationColumnId | null => {
    for (const colId of ['bookmark', 'applied', 'interviewing', 'offers'] as ApplicationColumnId[]) {
      if (applications[colId].some((j) => j.key === jobKey)) return colId
    }
    return null
  }

  // ── DnD handler ──
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)
    setDragOverCol(null)
    if (!over) return

    const jobKey = active.id as string
    const fromCol = findJobColumn(jobKey)
    // `over.id` could be a column ID (dropped on empty column area)
    // or another job's key (dropped on a job card inside a column)
    const overId = over.id as string
    const isColumnId = ['bookmark', 'applied', 'interviewing', 'offers'].includes(overId)

    let toCol: ApplicationColumnId | null = null
    if (isColumnId) {
      toCol = overId as ApplicationColumnId
    } else {
      // Dropped on a job — find that job's column
      toCol = findJobColumn(overId)
    }

    if (fromCol && toCol && fromCol !== toCol) {
      moveJob(jobKey, fromCol, toCol)
      notify({ message: `Moved to ${toCol}`, type: 'success' })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const jobKey = event.active.id as string
    const job = allJobs.find((j) => j.key === jobKey)
    setActiveJob(job ?? null)
  }

  const handleDragOver = (event: React.DragEvent | null, colId: ApplicationColumnId) => {
    setDragOverCol(colId)
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">
            {total} {t('bookmark').toLowerCase() === 'bookmark' ? 'Jobs' : 'งาน'}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-mono">
              {t('resume')}
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
            >
              {resumeNames.map((name) => (
                <option key={name} value={name}>
                  {name === 'all' ? t('all') : name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          // Highlight column during drag
          const overId = e.over?.id as string | undefined
          if (overId) {
            const isColumnId = ['bookmark', 'applied', 'interviewing', 'offers'].includes(overId)
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
                  <button
                    onClick={() => clearApplications()}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Clear"
                  >
                    ×
                  </button>
                </div>

                {/* Job Cards */}
                <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
                  {jobs.length === 0 && (
                    <div className="px-2 py-4 text-center">
                      <p className="text-[11px] text-muted-foreground">{t('noApplications')}</p>
                      <button
                        onClick={() => router.push('/chat')}
                        className="mt-2 text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {t('addJobs')}
                      </button>
                    </div>
                  )}

                  {jobs.map((job) => (
                    <DraggableJobCard key={job.key} job={job}>
                      <JobCardContent job={job} />
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeJob(job.key, col.id)
                            notify({ message: 'Removed from board', type: 'info' })
                          }}
                          className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 size={10} /> Remove
                        </button>
                      </div>
                    </DraggableJobCard>
                  ))}
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
    </div>
  )
}
