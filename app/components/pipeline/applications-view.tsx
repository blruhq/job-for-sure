'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Link2, MessageSquare, KanbanSquare } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import type { Pipeline, PipelineColumnId, PipelineJob } from '~/types/resume'

const COLUMNS: { id: PipelineColumnId; label: string; dot: string; next: PipelineColumnId | null }[] = [
  { id: 'bookmark', label: 'Bookmark', dot: '#9F9E98', next: 'applied' },
  { id: 'applied', label: 'Applied', dot: '#5B6ABF', next: 'interviewing' },
  { id: 'interviewing', label: 'Interviewing', dot: '#D4A316', next: 'offers' },
  { id: 'offers', label: 'Offers', dot: '#2B5F45', next: null },
]

export function ApplicationsView() {
  const router = useRouter()
  const { pipeline, resumes, moveJob, removeJob, clearPipeline } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [draggedFrom, setDraggedFrom] = useState<PipelineColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<PipelineColumnId | null>(null)

  // ── All jobs for filter ──
  const allJobs = [...pipeline.bookmark, ...pipeline.applied, ...pipeline.interviewing, ...pipeline.offers]
  const resumeNames = ['all', ...new Set(allJobs.map((j) => j.resume).filter(Boolean))]

  const filterJobs = (jobs: PipelineJob[]) => filter === 'all' ? jobs : jobs.filter((j) => j.resume === filter)

  // ── Stats ──
  const total = allJobs.length
  const avgScore = total > 0 ? Math.round(allJobs.reduce((s, j) => s + j.score, 0) / total) : 0

  // ── Drag handlers ──
  const onDragStart = (e: React.DragEvent, jobKey: string, fromCol: PipelineColumnId) => {
    setDraggedKey(jobKey)
    setDraggedFrom(fromCol)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragEnd = () => {
    setDraggedKey(null)
    setDraggedFrom(null)
    setDragOverCol(null)
  }
  const onDragOver = (e: React.DragEvent, col: PipelineColumnId) => {
    e.preventDefault()
    setDragOverCol(col)
  }
  const onDrop = (e: React.DragEvent, toCol: PipelineColumnId) => {
    e.preventDefault()
    setDragOverCol(null)
    if (draggedKey && draggedFrom && draggedFrom !== toCol) {
      moveJob(draggedKey, draggedFrom, toCol)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Applications</h1>
          <div className="text-xs text-muted-foreground">Track your job applications</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (confirm('Remove all jobs from your applications?')) clearPipeline() }}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-background hover:text-foreground"
          >
            <Trash2 size={13} /> Clear All
          </button>
          <button
            onClick={() => {
              const url = window.prompt('Paste a job URL to import:')
              if (url && url.trim()) {
                notify({ message: `Job import from "${url.slice(0, 40)}..." coming soon!`, type: 'info' })
              }
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Link2 size={13} /> Import Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 flex gap-4">
        {[
          { value: total, label: 'Total Applications' },
          { value: `${avgScore}%`, label: 'Avg Match Score', color: 'text-success' },
          { value: pipeline.interviewing.length, label: 'Interviews', color: 'text-[var(--warn)]' },
          { value: pipeline.offers.length, label: 'Offers', color: 'text-primary' },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 rounded-sm border border-border bg-card p-3">
            <div className={cn('font-mono text-lg font-semibold', stat.color)}>{stat.value}</div>
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="label-mono">Resume:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-sm border border-border bg-card py-1 pl-2.5 pr-8 text-xs text-foreground outline-none focus:border-primary"
        >
          {resumeNames.map((r) => (
            <option key={r} value={r}>{r === 'all' ? 'All Resumes' : r}</option>
          ))}
        </select>
      </div>

      {/* Empty state — no jobs at all */}
      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
            <KanbanSquare size={24} className="text-muted-foreground/50" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">No applications yet</h3>
          <p className="mb-4 max-w-xs text-xs text-muted-foreground">
            Bookmark matching jobs from the chat or import a job URL to start tracking.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/chat')}
              className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageSquare size={12} /> Go to Chat
            </button>
            <button
              onClick={() => {
                const url = window.prompt('Paste a job URL to import:')
                if (url && url.trim()) {
                  notify({ message: `Job import from "${url.slice(0, 40)}..." coming soon!`, type: 'info' })
                }
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <Link2 size={12} /> Import Job
            </button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      {total > 0 && (
      <div className="grid grid-cols-4 gap-2.5 items-start max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        {COLUMNS.map((col) => {
          const jobs = filterJobs(pipeline[col.id])
          const nextCol = COLUMNS.find((c) => c.id === col.next)
          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => onDrop(e, col.id)}
              className={cn(
                'min-h-[200px] rounded-sm border border-border bg-card p-2.5 transition-all',
                dragOverCol === col.id && 'border-primary bg-accent-soft',
              )}
            >
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.dot }} />
                  {col.label}
                </span>
                <span className="rounded-xs bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground">{jobs.length}</span>
              </div>

              {/* Empty state */}
              {jobs.length === 0 && (
                <div className="py-6 text-center font-mono text-[11px] text-muted-foreground">
                  <div className="mb-1.5 opacity-40">
                    {col.id === 'bookmark' ? '☆' : col.id === 'applied' ? '→' : col.id === 'interviewing' ? '◆' : '★'}
                  </div>
                  Drag jobs here
                </div>
              )}

              {/* Cards */}
              {jobs.map((job) => (
                <div
                  key={job.key}
                  draggable
                  onDragStart={(e) => onDragStart(e, job.key, col.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'mb-1.5 cursor-grab rounded-xs border border-border bg-card p-2.5 transition-all hover:border-primary active:cursor-grabbing',
                    draggedKey === job.key && 'rotate-2 opacity-40',
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-xs font-mono text-[8px] font-bold text-white" style={{ background: job.color }}>
                      {job.logo}
                    </div>
                    <span className="text-[11px] font-semibold">{job.company}</span>
                    <span className={cn(
                      'ml-auto rounded-xs px-1 py-px font-mono text-[10px] font-semibold',
                      job.level === 'high' ? 'bg-success-soft text-success' : 'bg-warn-soft text-[var(--warn)]',
                    )}>{job.score}%</span>
                  </div>
                  <div className="mb-1 text-xs font-medium">{job.title}</div>
                  <div className="mb-1.5 text-[11px] text-muted-foreground">{job.loc}</div>
                  {job.resume && (
                    <span className="mb-1.5 inline-block rounded-xs bg-background px-1.5 py-px font-mono text-[9px] text-muted-foreground">{job.resume}</span>
                  )}
                  <div className="flex items-center justify-between border-t border-border/50 pt-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{job.time}</span>
                    <div className="flex gap-1">
                      {nextCol && (
                        <button
                          onClick={() => moveJob(job.key, col.id, nextCol.id)}
                          className="text-[11px] font-medium text-primary hover:text-primary/80"
                        >
                          Move to {nextCol.label} →
                        </button>
                      )}
                      <button
                        onClick={() => removeJob(job.key, col.id)}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
