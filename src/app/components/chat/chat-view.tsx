'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from '~/i18n/routing'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { AgentChat } from '@/components/agent-elements/agent-chat'
import { InputBar } from '@/components/agent-elements/input-bar'
import type { InputBarProps } from '@/components/agent-elements/input-bar'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useCreateResume } from '~/hooks/use-resumes'
import { useResumes } from '~/hooks/use-resumes'
import { useApplications } from '~/hooks/use-apps'
import { useUIStore } from '~/hooks/use-ui'
import { createResume } from '~/lib/company-data'
import { normalizeParsed, type ParsedResumeFields } from '~/lib/resume-normalize'
import { notify } from '~/lib/toast'
import { cn } from '~/lib/utils'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { PasteJDModal } from '~/components/chat/paste-jd-modal'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { Skeleton } from '~/components/ui/skeleton'
import { UploadCardMessage } from '~/components/chat/upload-card-message'
import { Upload, FileText, ClipboardList, Loader2, Paperclip, RotateCcw, Sparkles, Save, Pencil } from 'lucide-react'

// (ParsedResumeFields + normalizeParsed now live in ~/lib/resume-normalize and
// are imported above.)

export function ChatView() {
  const router = useRouter()
  const { activeResume } = useActiveResume()
  const { data: resumes = [] } = useResumes()
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const targetCompanyKey = useUIStore((s) => s.targetCompanyKey)
  const setTargetCompanyKey = useUIStore((s) => s.setTargetCompanyKey)
  const { mutate: addResume } = useCreateResume()
  const { data: applications } = useApplications()
  const fileRef = useRef<HTMLInputElement>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  // Upload flow: idle → parsing → idle (card injected as message)
  const [uploadStage, setUploadStage] = useState<'idle' | 'parsing'>('idle')

  // ── BUILD MODE ──
  // Restore from sessionStorage on mount (survives refresh)
  const [buildData, setBuildData] = useState<WizardData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = sessionStorage.getItem('jfs-build-data')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [savingResume, setSavingResume] = useState(false)
  const [showCancelBuildDialog, setShowCancelBuildDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [buildStep, setBuildStep] = useState<string>('experience')

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

  // Ref to always have current activeResume for transport body
  const activeResumeRef = useRef(activeResume)
  activeResumeRef.current = activeResume

  // Build-mode ref — MUST be set synchronously before sendMessage
  const buildDataRef = useRef<WizardData | null>(buildData)
  buildDataRef.current = buildData

  // Persist buildData to sessionStorage (survives refresh)
  useEffect(() => {
    if (buildData) {
      sessionStorage.setItem('jfs-build-data', JSON.stringify(buildData))
    } else {
      sessionStorage.removeItem('jfs-build-data')
    }
  }, [buildData])

  // Saving ref — for stable CustomInputBar
  const savingResumeRef = useRef(false)
  savingResumeRef.current = savingResume

  const navigateTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Build step ref — for stable CustomInputBar (useCallback[])
  const buildStepRef = useRef(buildStep)
  buildStepRef.current = buildStep

  // ── BUILD PROGRESS STEPS ──
  // Fixed order. Driven by AI progress marker (<!--jfs-progress:STEP-->),
  // NOT by keyword matching. The AI knows what step it's on.
  const BUILD_STEPS = [
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'summary', label: 'Summary' },
  ] as const

  const openUpgradeModal = useUIStore((s) => s.openUpgradeModal)

  // Transport sends resume context with every chat request
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      // Intercept 402 (Free-plan limit reached) responses before the AI SDK
      // processes them. Parse the structured body and open the global UpgradeModal.
      fetch: async (input, init) => {
        const res = await fetch(input, init)
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}))
          openUpgradeModal({
            feature: body.feature ?? 'chat',
            limit: body.limit,
            featureLabel: 'chat messages',
            period: 'today',
          })
        }
        return res
      },
      body: () => ({
        mode: buildDataRef.current ? 'build' : 'coach',
        buildRole: buildDataRef.current?.role || '',
        buildIndustry: buildDataRef.current?.industry || '',
        context: {
          activeResume: activeResumeRef.current
            ? {
                name: activeResumeRef.current.name,
                role: activeResumeRef.current.role,
                persona: activeResumeRef.current.persona,
                email: activeResumeRef.current.email,
                phone: activeResumeRef.current.phone,
                location: activeResumeRef.current.location,
                github: activeResumeRef.current.github,
                summary: activeResumeRef.current.summary,
                skills: activeResumeRef.current.skills,
                experience: activeResumeRef.current.experience,
                education: activeResumeRef.current.education,
                projects: activeResumeRef.current.projects,
                certifications: activeResumeRef.current.certifications,
                languages: activeResumeRef.current.languages,
                customSections: activeResumeRef.current.customSections,
              }
            : null,
        },
      }),
    })
  }, [openUpgradeModal])

  const { messages, status, sendMessage, stop, setMessages, error, clearError } = useChat({ transport, messages: savedMessages })

  // Clear useChat error state shortly after it appears so the chat UI doesn't
  // show a stuck error indicator (e.g. after a 402 that opens the UpgradeModal).
  useEffect(() => {
    if (error) {
      const id = window.setTimeout(() => clearError(), 100)
      return () => window.clearTimeout(id)
    }
  }, [error, clearError])

  // ── Parse AI progress marker from last assistant message ──
  // The AI appends <!--jfs-progress:STEP--> to every response.
  // We scan the last assistant message (after streaming completes)
  // and update the progress indicator.
  useEffect(() => {
    if (!buildDataRef.current) return
    if (status === 'streaming' || status === 'submitted') return
    // Find the last assistant message
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastAssistant) return
    const text = lastAssistant.parts?.map((p) => (p.type === 'text' ? p.text : '')).join('') || ''
    // Match ALL progress markers, take the LAST one (in case AI included multiple)
    const matches = text.matchAll(/<!--jfs-progress:(\w+)-->/g)
    const matchesArray = Array.from(matches)
    if (matchesArray.length > 0) {
      const step = matchesArray[matchesArray.length - 1][1]
      if (['experience', 'education', 'skills', 'summary', 'complete'].includes(step)) {
        setBuildStep(step)
      }
    }
  }, [messages, status])

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
    // If in build mode, show confirm dialog instead of immediately clearing
    if (buildDataRef.current) {
      setShowCancelBuildDialog(true)
      return
    }
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    window.location.reload()
  }, [])

  const handleConfirmCancelBuild = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    buildDataRef.current = null
    setShowCancelBuildDialog(false)
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (navigateTimer.current) clearTimeout(navigateTimer.current)
    }
  }, [])

  const handleSend = (message: { role: 'user'; content: string }) => {
    let content = message.content
    // Only append target company context in coach mode (not build mode)
    if (targetCompanyKey !== 'none' && !buildDataRef.current) {
      const job = applications?.bookmark?.find((j) => j.key === targetCompanyKey)
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

    setUploadStage('parsing')
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
      const parsed = (await res.json()) as ParsedResumeFields
      const norm = normalizeParsed(parsed)

      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        ...norm,
      })

      addResume({ id: resume.id, data: resume })
      setActiveResumeId(resume.id)

      // Inject upload card as a chat message — it stays frozen at this position.
      // Follow with an assistant ack so the last message isn't 'user' (avoids infinite "Processing..." spinner).
      const uploadText = `📎 Resume uploaded: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}${resume.location ? ` (${resume.location})` : ''}`
      const locClause = resume.location ? ` based in **${resume.location}**` : ''
      const ackText = resume.role
        ? `Great! I've parsed your resume. I can see you're a **${resume.role}**${locClause}. I found ${resume.skills.length} skills in your profile. Ask me anything — I have your full resume context.`
        : `Great! I've parsed your resume${locClause}. Ask me anything — I have your full resume context.`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as unknown as UIMessage, {
        id: `upload-ack-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: ackText }],
        createdAt: new Date(),
      } as unknown as UIMessage])

      setUploadStage('idle')
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume. Try Build from Template instead.', type: 'error' })
      setUploadStage('idle')
    }
  }

  // ── BUILD FROM TEMPLATE (NEW FLOW) ──
  const handleWizardComplete = (data: WizardData) => {
    // Set ref SYNCHRONOUSLY before sendMessage so transport reads correct mode
    buildDataRef.current = data
    setBuildData(data)
    setWizardOpen(false)

    // Send initial message to start the guided conversation
    sendMessage({ text: `I want to build a resume for a ${data.role} role${data.industry ? ` in ${data.industry}` : ''}.` })
  }

  // ── SAVE RESUME FROM CHAT ──
  const handleSaveResumeRef = useRef<() => void>(() => {})

  const handleSaveResume = useCallback(async () => {
    if (!buildDataRef.current || savingResumeRef.current) return
    savingResumeRef.current = true
    setSavingResume(true)

    try {
      const res = await fetch('/api/resume/from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.parts?.map((p) => (p.type === 'text' ? p.text : '')).join(' ') || '',
          })),
          template: buildDataRef.current.template,
          role: buildDataRef.current.role,
          industry: buildDataRef.current.industry,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to build resume')
      }

      const parsed = (await res.json()) as ParsedResumeFields
      const norm = normalizeParsed(parsed)

      const resume = createResume({
        name: `${norm.persona || buildDataRef.current.role} Resume`,
        ...norm,
        role: buildDataRef.current.role, // role wins over parsed
        template: buildDataRef.current.template,
      })

      addResume({ id: resume.id, data: resume })
      setActiveResumeId(resume.id)

      const ackText = `✅ Resume saved! I've created your **${buildDataRef.current.role}** resume with the **${buildDataRef.current.template}** template. You can open the editor to make any changes.`
      setMessages(prev => [...prev, {
        id: `save-ack-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: ackText }],
        createdAt: new Date(),
      } as unknown as UIMessage])

      // Exit build mode
      buildDataRef.current = null
      setBuildData(null)
      sessionStorage.removeItem('jfs-build-data')

      notify({ message: 'Resume created!', type: 'success' })

      if (navigateTimer.current) clearTimeout(navigateTimer.current)
      navigateTimer.current = setTimeout(() => router.push(`/resume/${resume.id}`), 600)
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to build resume', type: 'error' })
    } finally {
      savingResumeRef.current = false
      setSavingResume(false)
    }
  }, [messages, addResume, setActiveResumeId, setMessages, router])

  // Keep ref in sync so CustomInputBar (useCallback[]) always calls latest version
  handleSaveResumeRef.current = handleSaveResume

  // ── ESCAPE HATCH: Extract partial data, then open editor ──
  const handleSwitchToManual = useCallback(async () => {
    const data = buildDataRef.current
    if (!data) return
    setShowManualDialog(false)

    // If there are enough messages, try to extract partial data
    const userMessages = messages.filter((m) => m.role === 'user')
    if (userMessages.length >= 2) {
      try {
        const res = await fetch('/api/resume/from-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.parts?.map((p) => (p.type === 'text' ? p.text : '')).join(' ') || '',
            })),
            template: data.template,
            role: data.role,
            industry: data.industry,
          }),
        })

        if (res.ok) {
      const parsed = (await res.json()) as ParsedResumeFields
      const norm = normalizeParsed(parsed)

      const resume = createResume({
        ...norm,
        name: `${data.role} Resume`,
        role: data.role,
        template: data.template,
      })
      addResume({ id: resume.id, data: resume })
      setActiveResumeId(resume.id)

          buildDataRef.current = null
          setBuildData(null)
          sessionStorage.removeItem('jfs-build-data')

          notify({ message: 'Opened your resume in the editor', type: 'info' })
          router.push(`/resume/${resume.id}`)
          return
        }
      } catch (err) {
        console.error(err)
        notify({ message: 'Failed to extract resume data', type: 'error' })
      }
    }

    // Not enough data or extraction failed — create blank resume
    const resume = createResume({
      name: `${data.role} Resume`,
      role: data.role,
      persona: 'Your Name',
      skills: [],
      template: data.template,
    })

    addResume({ id: resume.id, data: resume })
    setActiveResumeId(resume.id)

    buildDataRef.current = null
    setBuildData(null)
    sessionStorage.removeItem('jfs-build-data')

    notify({ message: 'Opened blank resume in editor', type: 'info' })
    router.push(`/resume/${resume.id}`)
  }, [messages, addResume, setActiveResumeId, router])

  const handleSwitchToManualRef = useRef(handleSwitchToManual)
  handleSwitchToManualRef.current = handleSwitchToManual

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

  // Ref for disabling input during resume parsing
  const isUploading = uploadStage === 'parsing'
  const isUploadingRef = useRef(isUploading)
  isUploadingRef.current = isUploading

  // Stable custom InputBar — never recreates, so InputBar inside never remounts
  const CustomInputBar = useCallback(function CustomInputBar(props: InputBarProps) {
    // onAttach is currently unused but kept in the destructure to prevent it
    // from being passed through to the underlying <InputBar>.
    const { onAttach: _onAttach, ...inputBarProps } = props
    void _onAttach

    const building = buildDataRef.current
    const saving = savingResumeRef.current

    return (
      <div>
        {/* ── Build mode banner ── */}
        {building && (
          <div className="border-t border-primary/20 bg-primary/5 px-4 py-2">
            {/* Row 1: info + buttons */}
            <div className="mx-auto flex max-w-an items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles size={12} className="shrink-0 text-primary" />
                <span className="truncate text-[11px] text-foreground">
                  Building: <strong>{building.role}</strong>
                  {building.industry ? ` · ${building.industry}` : ''}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setShowManualDialog(true)}
                  className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Open what you have so far in the editor"
                >
                  <Pencil size={10} /> Edit Manually
                </button>
                <button
                  onClick={() => handleSaveResumeRef.current()}
                  disabled={saving}
                  className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Save your resume"
                >
                  <Save size={10} /> {saving ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </div>
            {/* Row 2: AI-driven progress steps */}
            <div className="mx-auto mt-1.5 flex max-w-an items-center gap-2.5">
              {BUILD_STEPS.map((s, i) => {
                const stepIndex = BUILD_STEPS.findIndex(x => x.id === buildStepRef.current)
                const isComplete = buildStepRef.current === 'complete'
                const done = isComplete || (stepIndex > -1 && i < stepIndex)
                const current = !isComplete && stepIndex === i
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      done ? 'bg-success' : current ? 'bg-primary' : 'bg-border',
                    )} />
                    <span className={cn(
                      'text-[9px] font-mono transition-colors',
                      done ? 'text-success' : current ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
              {buildStepRef.current === 'complete' && (
                <span className="text-[9px] font-mono text-success ml-1">✓ Ready to save!</span>
              )}
            </div>
          </div>
        )}

        {/* Action pills — visible when chat has messages AND not in build mode */}
        {showPillBarRef.current && !building && (
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
                  Build with AI
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
          disabled={isUploadingRef.current || saving}
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
    // Empty deps are correct: BUILD_STEPS is a module constant and the
    // InputBar must keep a stable identity so the underlying chat doesn't
    // remount on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CustomInputBar identity is preserved by the empty-deps useCallback above;
  // adding it here would invalidate slots on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slots = useMemo(() => ({ InputBar: CustomInputBar, UserMessage: UploadCardMessage }), [])

  // ── ENTRY CARDS (shown above AgentChat when no messages) ──
  const showEntryCards = messages.length === 0 && uploadStage === 'idle'

  return (
    <div className="flex h-full flex-col">
      {/* Status bar — hidden during build mode */}
      {!buildData && (
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
            disabled={(applications?.bookmark?.length ?? 0) === 0}
            className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
          >
            <option value="none">General Career Coach</option>
            {(applications?.bookmark ?? []).map((job) => (
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
      )}


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
              <div className="text-sm font-semibold text-foreground">Build with AI</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Answer questions · 5 min</div>
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
          <AgentChat
            messages={messages}
            status={status}
            onSend={handleSend}
            onStop={stop}
            slots={slots}
            suggestions={buildData ? [] : [
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
            bottomContent={
              uploadStage === 'parsing' ? (
                <div className="mx-auto max-w-an w-full px-4 py-3">
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={12} className="animate-spin text-primary" />
                      <span className="font-mono text-[11px]">Parsing your resume…</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-2.5 w-4/5" />
                      <Skeleton className="h-2.5 w-2/5" />
                    </div>
                  </div>
                </div>
              ) : undefined
            }
            className="h-full chat-fade-in"
          />
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

      {/* Cancel build confirm */}
      <ConfirmDialog
        open={showCancelBuildDialog}
        onClose={() => setShowCancelBuildDialog(false)}
        onConfirm={handleConfirmCancelBuild}
        title="Cancel Resume Build?"
        description="You'll lose the conversation progress. Your resume won't be created."
        confirmLabel="Yes, Cancel Build"
        variant="danger"
      />

      {/* Manual editor confirm */}
      <ConfirmDialog
        open={showManualDialog}
        onClose={() => setShowManualDialog(false)}
        onConfirm={() => handleSwitchToManualRef.current()}
        title="Open in Editor?"
        description="We'll create a resume with what you've shared so far and open it in the editor. You can continue editing there."
        confirmLabel="Open in Editor"
        variant="default"
      />
    </div>
  )
}
