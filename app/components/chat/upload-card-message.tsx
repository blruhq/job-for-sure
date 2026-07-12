'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'
import { UserMessage } from '@/components/agent-elements/user-message'
import { useAppStore } from '~/lib/store'
import { JobPreview } from '~/components/chat/job-preview'

type UploadCardMessageProps = {
  message: UIMessage
  className?: string
  enableImagePreview?: boolean
}

export const UploadCardMessage = memo(function UploadCardMessage({
  message,
  className,
  enableImagePreview = true,
}: UploadCardMessageProps) {
  const router = useRouter()
  const { resumes } = useAppStore()

  // Check for data-upload part
  const uploadPart = (message.parts ?? []).find(
    (p: any) => p.type === 'data-upload'
  ) as { type: 'data-upload'; data: { resumeId: string } } | undefined

  if (uploadPart) {
    const resume = resumes.find((r) => r.id === uploadPart.data.resumeId)
    if (!resume) return null

    return (
      <div className="w-full space-y-3">
        {/* Resume summary card */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-semibold text-foreground">{resume.persona || 'Your Name'}</span>
            {resume.role && (
              <span className="text-[11px] text-primary">· {resume.role}</span>
            )}
          </div>
          {resume.summary && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{resume.summary}</p>
          )}
          {resume.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {resume.skills.slice(0, 12).map((s, i) => (
                <span key={i} className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">{s}</span>
              ))}
              {resume.skills.length > 12 && (
                <span className="text-[9px] text-muted-foreground">+{resume.skills.length - 12} more</span>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => router.push(`/resume/${resume.id}`)}
              className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
            >
              View Resume →
            </button>
            <button
              onClick={() => router.push(`/resume/${resume.id}?tab=editor`)}
              className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Edit Resume →
            </button>
          </div>
        </div>
        {/* Job preview — manages its own loading */}
        <JobPreview resume={resume} />
      </div>
    )
  }

  // Normal user message — delegate to default renderer
  return <UserMessage message={message} className={className} enableImagePreview={enableImagePreview} />
})
