'use client'

import { Clock, Bookmark, Send, CalendarCheck, XCircle } from 'lucide-react'
import type { PipelineJob } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// Timeline — shows the lifecycle of a job application.
// Renders events based on the job's status and timestamps.
// ═══════════════════════════════════════════════════════════════

interface TimelineEvent {
  icon: React.ReactNode
  label: string
  date: string
  color: string
}

export function Timeline({ job, currentStatus }: { job: PipelineJob; currentStatus: string }) {
  const events: TimelineEvent[] = [
    {
      icon: <Bookmark size={11} />,
      label: 'Job saved',
      date: job.addedAt,
      color: 'text-muted-foreground',
    },
  ]

  // Add status transition events
  if (currentStatus === 'applied' || currentStatus === 'interviewing' || currentStatus === 'offered') {
    events.push({
      icon: <Send size={11} />,
      label: 'Applied',
      date: job.appliedAt || job.addedAt,
      color: 'text-blue-500',
    })
  }

  if (currentStatus === 'interviewing' || currentStatus === 'offered') {
    events.push({
      icon: <CalendarCheck size={11} />,
      label: 'Interviewing',
      date: job.addedAt,
      color: 'text-amber-500',
    })
  }

  if (currentStatus === 'offered') {
    events.push({
      icon: <CalendarCheck size={11} />,
      label: 'Offer received',
      date: job.addedAt,
      color: 'text-green-500',
    })
  }

  if (currentStatus === 'rejected') {
    events.push({
      icon: <XCircle size={11} />,
      label: 'Rejected',
      date: job.addedAt,
      color: 'text-red-500',
    })
  }

  if (events.length <= 1) return null

  return (
    <div>
      <div className="label-mono mb-2 flex items-center gap-1">
        <Clock size={11} /> Timeline
      </div>
      <div className="relative space-y-0">
        {events.map((event, i) => (
          <div key={i} className="flex gap-2.5">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div className={`flex h-4 w-4 items-center justify-center rounded-full neuro-surface ${event.color}`}>
                {event.icon}
              </div>
              {i < events.length - 1 && (
                <div className="mt-0.5 h-full w-px bg-muted-foreground/20" />
              )}
            </div>
            {/* Content */}
            <div className="pb-3">
              <div className="text-xs font-medium text-foreground">{event.label}</div>
              <div className="text-[10px] text-muted-foreground">
                {formatTimelineDate(event.date)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTimelineDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } catch {
    console.error('Failed to format timeline date')
    return ''
  }
}
