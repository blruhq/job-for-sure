'use client'

import { memo, useState, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import type { UIMessage } from 'ai'
import { Briefcase, MapPin, Check, Pencil } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { UserMessage } from '@/components/agent-elements/user-message'
import { useResumes, useUpdateResume } from '~/hooks/use-resumes'
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
  const { data: resumes = [] } = useResumes()
  const { mutate: updateResume } = useUpdateResume()

  // Check for data-upload part
  const uploadPart = (message.parts ?? []).find(
    (p) => p.type === 'data-upload'
  ) as { type: 'data-upload'; data: { resumeId: string } } | undefined

  const resumeId = uploadPart?.data.resumeId
  const resume = resumes.find((r) => r.id === resumeId)

  const [isEditing, setIsEditing] = useState(false)
  const [roleInput, setRoleInput] = useState('')
  const [locationInput, setLocationInput] = useState('')

  // Sync inputs with resume object
  const lastResumeIdRef = useRef<string | null>(null)
  if (resume && resume.id !== lastResumeIdRef.current) {
    lastResumeIdRef.current = resume.id
    setRoleInput(resume.role || '')
    setLocationInput(resume.location || '')
    setIsEditing(!resume.role)
  }

  if (uploadPart) {
    if (!resume) return null

    return (
      <div className="w-full space-y-3">
        {/* Resume summary card */}
        <div className="rounded-md neuro-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{resume.persona || 'Your Name'}</span>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-[10px] flex items-center gap-1 h-auto p-0">
                <Pencil size={10} /> Edit Filters
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3 bg-muted/30 p-2.5 rounded-sm border border-border/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Briefcase size={10} /> Target Role
                </label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full text-xs px-2 py-1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin size={10} /> Location
                </label>
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Thailand or Remote"
                  className="w-full text-xs px-2 py-1"
                />
              </div>
              <Button
                variant="default"
                onClick={() => {
                  updateResume({ id: resume.id, data: { role: roleInput, location: locationInput } })
                  setIsEditing(false)
                }}
                disabled={roleInput.trim().length < 2}
                className="w-full flex items-center justify-center gap-1 py-1 text-xs font-medium"
              >
                <Check size={11} /> Confirm & Search Jobs
              </Button>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-muted-foreground">
              {resume.role && (
                <div className="flex items-center gap-1.5">
                  <Briefcase size={10} className="text-primary shrink-0" />
                  <span>Targeting: <strong className="text-foreground">{resume.role}</strong></span>
                </div>
              )}
              {resume.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-primary shrink-0" />
                  <span>Location: <strong className="text-foreground">{resume.location}</strong></span>
                </div>
              )}
            </div>
          )}

          {resume.summary && !isEditing && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{resume.summary}</p>
          )}

          {resume.skills.length > 0 && !isEditing && (
            <div className="mt-2 flex flex-wrap gap-1">
              {resume.skills.slice(0, 12).map((s, i) => (
                <span key={i} className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
              ))}
              {resume.skills.length > 12 && (
                <span className="text-[10px] text-muted-foreground">+{resume.skills.length - 12} more</span>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="link"
                onClick={() => router.push(`/resume/${resume.id}`)}
                className="text-xs font-medium"
              >
                View Resume →
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(`/resume/${resume.id}?tab=editor`)}
                className="text-xs font-medium"
              >
                Edit Resume →
              </Button>
            </div>
          )}
        </div>
        {/* Job preview — manages its own loading */}
        {!isEditing && <JobPreview resume={resume} />}
      </div>
    )
  }

  // Normal user message — delegate to default renderer
  return <UserMessage message={message} className={className} enableImagePreview={enableImagePreview} />
})
