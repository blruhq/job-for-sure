'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { AgentChat } from '@/components/agent-elements/agent-chat'
import { InputBar } from '@/components/agent-elements/input-bar'
import type { InputBarProps } from '@/components/agent-elements/input-bar'
import { useAppStore } from '~/lib/store'
import { createResume } from '~/lib/company-data'
import { notify } from '~/lib/toast'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { PasteJDModal } from '~/components/chat/paste-jd-modal'
import { SkeletonChatMessage, SkeletonCard } from '~/components/ui/skeleton'
import { Upload, FileText, ClipboardList, Loader2, Paperclip, RotateCcw } from 'lucide-react'
import { JobPreview } from '~/components/chat/job-preview'

export function ChatView() {
  const router = useRouter()
  const { activeResume, addResume, updateResume, targetCompanyKey, setTargetCompanyKey, resumes, activeResumeId, setActiveResumeId, applications } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [jobPreviewResumeId, setJobPreviewResumeId] = useState<string | null>(null)

  // ── CHAT PERSISTENCE (sessionStorage) ──
  // Load saved messages from sessionStorage on mount.
  const [savedMessages] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = sessionStorage.getItem('jfs-chat-messages')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // We pass `messages: savedMessages` to seed the hook in AI SDK v4/v5
  const { messages, status, sendMessage, stop } = useChat({ messages: savedMessages })

  // Sync messages back to sessionStorage when the response completes (not during stream)
  const prevMessagesRef = useRef('')
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') return
    if (messages.length === 0) return
    const serialized = JSON.stringify(messages)
    if (serialized === prevMessagesRef.current) return
    prevMessagesRef.current = serialized
    try {
      sessionStorage.setItem('jfs-chat-messages', serialized)
    } catch {
      /* quota exceeded — silently fail */
    }
  }, [messages, status])

  // New Chat handler: clear session storage & reload
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    window.location.reload()
  }, [])

  // ── Auto-send pending chat message (from "Coach for Job" button) ──
  useEffect(() => {
    const pending = sessionStorage.getItem('jfs_pending_chat')
    if (pending) {
      sessionStorage.removeItem('jfs_pending_chat')
      sendMessage({ text: pending })
    }
  }, [sendMessage])

  const handleSend = (message: { role: 'user'; content: string }) => {
    let content = message.content
    if (targetCompanyKey !== 'none') {
      const job = applications.bookmark.find((j) => j.key === targetCompanyKey)
      if (job) {
        content += `\n\n*(Context: I am asking this in the context of my application for the ${job.title} role at ${job.company} (Match Score: ${job.score}%). Please tailor your response for this role.)*`
      }
    }
    sendMessage({ text: content })
  }

  // ── UPLOAD RESUME ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Size limit: 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      notify({ message: 'File too large. Maximum size is 5MB.', type: 'error' })
      return
    }

    setProcessing(true)
    try {
      // Send file to server — server handles text extraction + AI parsing
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
      const parsed = await res.json()

      // Create resume from parsed data
      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        role: parsed.role || 'Software Engineer',
        persona: parsed.name || 'Your Name',
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        github: parsed.github,
        summary: parsed.summary,
        skills: parsed.skills?.length > 0 ? parsed.skills : ['JavaScript', 'Git'],
        experience: parsed.experience?.map((e: any) => ({
          company: e.company || '',
          role: e.role || '',
          dates: e.dates || '',
          bullets: e.bullets || [],
        })),
        education: parsed.education?.map((e: any) => ({
          institution: e.institution || '',
          degree: e.degree || '',
          field: e.field || '',
          dates: e.dates || '',
        })),
        projects: parsed.projects?.map((p: any) => ({
          name: p.name || '',
          description: p.description || '',
          techStack: p.techStack || [],
          link: p.link || '',
        })),
        certifications: parsed.certifications?.map((c: any) => ({
          name: c.name || '',
          issuer: c.issuer || '',
          date: c.date || '',
        })),
        languages: parsed.languages?.map((l: any) => ({
          name: l.name || '',
          proficiency: l.proficiency || '',
        })),
        customSections: parsed.customSections?.map((cs: any) => ({
          title: cs.title || '',
          bullets: cs.bullets || [],
        })),
      })

      addResume(resume)
      sendMessage({ text: `I just uploaded my resume. Here's my profile:\n- **Name:** ${resume.persona || 'Not specified'}\n- **Role:** ${resume.role}\n- **Skills:** ${resume.skills.join(', ')}\n- **Summary:** ${resume.summary || 'Not provided'}\n- **Location:** ${resume.location || 'Not specified'}\n\nCan you analyze my resume and give me feedback on how to improve it?` })
      setJobPreviewResumeId(resume.id)
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume. Try Build from Template instead.', type: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  // ── BUILD FROM TEMPLATE WIZARD ──
  const handleWizardComplete = async (data: WizardData) => {
    setProcessing(true)
    try {
      const resume = createResume({
        name: data.role,
        role: data.role,
        persona: data.name,
        email: data.email,
        location: data.location,
        summary: data.summary || `Professional with experience in ${data.skills.slice(0, 3).join(', ')}.`,
        skills: data.skills,
        experience: [{
          company: data.company,
          role: data.companyRole || data.role,
          dates: data.dates,
          bullets: data.bullets.split('\n').filter(Boolean),
        }],
      })

      addResume(resume)
      sendMessage({ text: `I built my resume profile:\n- **Name:** ${resume.persona || data.name}\n- **Role:** ${resume.role}\n- **Skills:** ${resume.skills.join(', ')}\n- **Summary:** ${resume.summary || 'Not provided'}\n\nCan you give me feedback and suggestions?` })
      setJobPreviewResumeId(resume.id)
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to create resume from wizard', type: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  // ── PASTE JOB DESCRIPTION ──
  const handlePasteJD = (jdText: string) => {
    if (!activeResume) {
      sendMessage({ text: 'I want to analyze a job posting but I need to upload a resume first.' })
      notify({ message: 'Upload or build a resume first, then paste a job posting.', type: 'info' })
      return
    }
    sendMessage({ text: `Analyze this job posting against my resume (${activeResume.role}). Here's the JD:\n\n${jdText.slice(0, 2000)}` })
  }

  // ── PILL BAR — persistent actions above input when chat has messages ──
  // Use a ref so the custom InputBar component stays stable (no remount)
  const showPillBar = messages.length > 0
  const showPillBarRef = useRef(false)
  showPillBarRef.current = showPillBar

  // Stable custom InputBar — never recreates, so InputBar inside never remounts
  const CustomInputBar = useCallback(function CustomInputBar(props: InputBarProps) {
    // Destructure onAttach to prevent it from reaching InputBar (hides the + button)
    const { onAttach, ...inputBarProps } = props

    return (
      <div>
        {/* Action pills — visible when chat has messages */}
        {showPillBarRef.current && (
          <div className="px-3">
            <div className="mx-auto max-w-an">
              <div className="flex items-center gap-1.5 pb-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <Upload size={11} />
                  Upload Resume
                </button>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <FileText size={11} />
                  Build Template
                </button>
                <button
                  onClick={() => setPasteOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <ClipboardList size={11} />
                  Paste Job
                </button>
              </div>
            </div>
          </div>
        )}

        <InputBar
          {...inputBarProps}
          leftActions={
            <button
              onClick={() => fileRef.current?.click()}
              className="size-7 rounded-full inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
              aria-label="Attach file"
            >
              <Paperclip size={14} className="text-neutral-400 dark:text-neutral-600" />
            </button>
          }
        />
      </div>
    )
  }, [])

  const slots = useMemo(() => ({ InputBar: CustomInputBar }), [])

  // ── ENTRY CARDS (shown above AgentChat when no messages) ──
  const showEntryCards = messages.length === 0 && !processing

  return (
    <div className="flex h-full flex-col">
      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Profile:</span>
          <select
            value={activeResumeId ?? 'none'}
            onChange={(e) => {
              const val = e.target.value
              if (val !== 'none') setActiveResumeId(val)
            }}
            disabled={resumes.length === 0}
            className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
          >
            {resumes.length === 0 ? (
              <option value="none">None (Upload first)</option>
            ) : (
              resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.score}%)</option>
              ))
            )}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Target:</span>
          <select
            value={targetCompanyKey}
            onChange={(e) => setTargetCompanyKey(e.target.value)}
            disabled={applications.bookmark.length === 0}
            className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
          >
            <option value="none">General Career Coach</option>
            {applications.bookmark.map((job) => (
              <option key={job.key} value={job.key}>{job.company} ({job.title})</option>
            ))}
          </select>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Start a new conversation"
          >
            <RotateCcw size={11} />
            New Chat
          </button>
        )}
      </div>


      {/* Entry cards — shown when chat is empty */}
      {showEntryCards && (
        <div className="flex flex-col items-center justify-center px-6 py-10">
          <div
            className="mb-6 animate-fade-up text-center text-2xl text-foreground"
            style={{ fontFamily: 'var(--font-instrument-serif), serif', animationDelay: '0ms', animationFillMode: 'both' }}
          >
            How do you want to start?
          </div>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:shadow-sm animate-fade-up"
              style={{ animationDelay: '100ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary transition-transform group-hover:scale-110">
                <Upload size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Upload Resume</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">PDF, DOCX, or text</div>
            </button>

            {/* Build from Template */}
            <button
              onClick={() => setWizardOpen(true)}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:shadow-sm animate-fade-up"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success transition-transform group-hover:scale-110">
                <FileText size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Build from Template</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">No resume? Start here</div>
            </button>

            {/* Paste Job Posting */}
            <button
              onClick={() => setPasteOpen(true)}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:shadow-sm animate-fade-up"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-warn-soft text-[var(--warn)] transition-transform group-hover:scale-110">
                <ClipboardList size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Paste Job Posting</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Analyze a JD</div>
            </button>
          </div>
        </div>
      )}

      {/* Agent Chat — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {processing && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="w-full max-w-[680px] space-y-3 animate-fade-up">
              <SkeletonChatMessage />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={10} className="animate-spin text-primary" />
                <span className="font-mono text-[10px]">AI is analyzing your resume…</span>
              </div>
            </div>
          </div>
        ) : (
          <AgentChat
            messages={messages}
            status={status}
            onSend={handleSend}
            onStop={stop}
            slots={slots}
            suggestions={[
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
            bottomContent={
              !processing && jobPreviewResumeId && resumes.find((r) => r.id === jobPreviewResumeId) ? (
                <div className="mx-auto max-w-[680px] w-full px-4 md:px-0 py-3 animate-fade-up">
                  <JobPreview
                    resume={resumes.find((r) => r.id === jobPreviewResumeId)!}
                    onDismiss={() => setJobPreviewResumeId(null)}
                  />
                </div>
              ) : null
            }
            className="h-full chat-fade-in"
          />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.text,.pdf,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modals */}
      <BuildWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
      <PasteJDModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onSubmit={handlePasteJD}
      />
    </div>
  )
}
