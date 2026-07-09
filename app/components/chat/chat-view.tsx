'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip, Send, Upload, FileText, ClipboardList } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { createResumeFromUpload, createResumeFromWizard } from '~/lib/company-data'
import { InlineMatchList, InlineResumePreview, EntryCards } from '~/components/chat/inline-cards'
import type { ChatMessage, Company } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// CHAT MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isCoach = msg.role === 'coach'
  return (
    <div className={cn('flex items-start gap-2.5', !isCoach && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold',
          isCoach ? 'bg-primary text-white' : 'bg-sidebar-active text-muted-foreground',
        )}
      >
        {isCoach ? 'AI' : 'JD'}
      </div>
      <div className={cn('min-w-0 flex-1 pt-0.5', !isCoach && 'flex flex-col items-end')}>
        <div className="mb-0.5 text-xs font-semibold">{msg.name}</div>
        <div
          className={cn(
            'inline-block max-w-full rounded-md px-3.5 py-2.5 text-xs leading-relaxed',
            isCoach
              ? 'border border-border bg-card'
              : 'bg-accent-soft text-foreground',
          )}
        >
          {msg.kind === 'matches' && msg.data ? (
            <MatchContent html={msg.content} companies={msg.data as Company[]} />
          ) : msg.kind === 'resume' && msg.data ? (
            <>
              <span dangerouslySetInnerHTML={{ __html: msg.content }} />
              <InlineResumePreview resume={msg.data as unknown as import('~/types/resume').Resume} />
            </>
          ) : msg.kind === 'entry' ? (
            <EntryContent html={msg.content} />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: msg.content }} />
          )}
        </div>
      </div>
    </div>
  )
}

function MatchContent({ html, companies }: { html: string; companies: Company[] }) {
  return (
    <>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      <InlineMatchList companies={companies} />
    </>
  )
}

function EntryContent({ html }: { html: string }) {
  const { addResume } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleUpload = () => fileRef.current?.click()
  const handleWizard = () => {
    // Trigger wizard via custom event
    window.dispatchEvent(new CustomEvent('jfs-start-wizard'))
  }
  const handlePasteJD = () => {
    window.dispatchEvent(new CustomEvent('jfs-paste-jd'))
  }

  return (
    <>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      <EntryCards onUpload={handleUpload} onWizard={handleWizard} onPasteJD={handlePasteJD} />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const resume = createResumeFromUpload(file.name)
            addResume(resume)
            window.dispatchEvent(new CustomEvent('jfs-file-upload', { detail: file.name }))
          }
          e.target.value = ''
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[11px] font-bold text-white">
        AI
      </div>
      <div className="inline-block rounded-md border border-border bg-card px-3.5 py-2.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-[5px] w-[5px] rounded-full bg-muted-foreground"
              style={{ animation: `typing-dot 1.4s infinite ${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// QUICK ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════
const QUICK_ACTIONS = [
  { label: 'Upload resume', event: 'upload' },
  { label: 'Build from template', event: 'wizard' },
  { label: 'Paste job posting', event: 'paste-jd' },
  { label: 'Find jobs', event: 'matches' },
  { label: 'Score my resume', event: 'score' },
  { label: 'Interview prep', event: 'interview' },
  { label: 'Salary advice', event: 'salary' },
] as const

// ═══════════════════════════════════════════════════════════════
// MAIN CHAT VIEW
// ═══════════════════════════════════════════════════════════════
export function ChatView() {
  const router = useRouter()
  const { activeResume, resumes, activeResumeId, setActiveResumeId, addResume, targetCompanyKey, setTargetCompanyKey, bookmarkJob } = useAppStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const msgIdRef = useRef(0)

  const nextId = () => `msg-${++msgIdRef.current}`

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typing, scrollToBottom])

  // ── Message helpers ──
  const addCoachMsg = useCallback((content: string, kind?: ChatMessage['kind'], data?: unknown) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'coach', name: 'Coach', content, kind, data }])
  }, [])

  const addUserMsg = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', name: 'You', content: text, kind: 'text' }])
  }, [])

  const coachReply = useCallback((content: string, kind?: ChatMessage['kind'], data?: unknown, delay = 600) => {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      addCoachMsg(content, kind, data)
    }, delay)
  }, [addCoachMsg])

  // ── Welcome message ──
  useEffect(() => {
    if (messages.length === 0) {
      addCoachMsg(
        `Welcome to Job For Sure! I'm your AI career coach. I can match your resume with companies, tailor it for specific roles, and help you prep for interviews.<br><br>How do you want to start?`,
        'entry',
      )
    }
  }, [messages.length, addCoachMsg])

  // ── Intent matching ──
  const handleUserIntent = useCallback((text: string) => {
    const lower = text.toLowerCase()
    const r = activeResume

    if (lower.includes('upload') || lower.includes('resume')) {
      if (r) {
        coachReply(`Your active resume is <strong>${r.name}</strong> (${r.score}%). Want to see matches or upload a new one?`)
      } else {
        coachReply('Click the attach button or "Upload resume" below to add your resume.')
      }
    } else if (lower.includes('match') || lower.includes('job') || lower.includes('find') || lower.includes('search')) {
      if (!r) { coachReply('Upload a resume first and I\'ll find matching companies instantly!'); return }
      const html = `Here are companies matching your <strong>${r.name}</strong> resume:`
      coachReply(html, 'matches', r.companies)
      if (r.stretch?.length) {
        setTimeout(() => coachReply(`<strong>Stretch roles</strong> (you could grow into):`, 'matches', r.stretch, 1200), 200)
      }
    } else if (lower.includes('score')) {
      if (!r) { coachReply('Upload a resume first!'); return }
      coachReply(`Your <strong>${r.name}</strong> resume scores <strong>${r.score}%</strong>. Top match: ${r.companies[0].name} at ${r.companies[0].score}%. Skills: ${r.skills.join(', ')}.`)
    } else if (lower.includes('interview') || lower.includes('prep')) {
      if (!r) { coachReply('Upload a resume first!'); return }
      coachReply(`Priority: <strong>${r.companies[0].name}</strong> for ${r.companies[0].role}. Expect questions on ${r.skills.slice(0, 3).join(', ')}. Salary band: ${r.companies[0].salary}. Prep a demo.`)
    } else if (lower.includes('salary') || lower.includes('pay') || lower.includes('offer')) {
      if (!r) { coachReply('Upload a resume first!'); return }
      coachReply(`For ${r.companies[0].role}: <strong>${r.companies[0].salary}</strong> at ${r.companies[0].name}. Negotiate equity + signing bonus.`)
    } else if (lower.includes('tailor')) {
      if (!r) { coachReply('Upload a resume first!'); return }
      if (r.stretch?.[0]) {
        coachReply(`Tailoring for ${r.stretch[0].name} — ${r.stretch[0].role}...`, 'resume', r, 800)
      } else {
        coachReply('No stretch roles to tailor for. Your direct matches are already strong!')
      }
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      coachReply(r
        ? `Hi! You have ${r.companies.length} matches for your ${r.name} resume. What should we work on?`
        : 'Hi! Upload a resume or build one to get started. I can match you with companies instantly.')
    } else {
      coachReply(r
        ? 'I can help with: finding jobs, scoring your resume, interview prep, salary advice, or tailoring for a specific role. What do you need?'
        : 'Upload a resume first, then I can find matching companies, score your resume, prep for interviews, and more!')
    }
  }, [activeResume, coachReply])

  // ── Send chat ──
  const sendChat = () => {
    const text = input.trim()
    if (!text) return
    addUserMsg(text)
    setInput('')
    handleUserIntent(text)
  }

  // ── Quick actions ──
  const quickAction = (action: string) => {
    if (action === 'matches') {
      addUserMsg('Find jobs')
      if (!activeResume) { coachReply('Upload a resume first!'); return }
      coachReply(`Here are your matches:`, 'matches', activeResume.companies)
      if (activeResume.stretch?.length) {
        setTimeout(() => coachReply(`<strong>Stretch roles:</strong>`, 'matches', activeResume.stretch, 1200), 200)
      }
    } else if (action === 'score') {
      addUserMsg('Score my resume')
      handleUserIntent('score')
    } else if (action === 'interview') {
      addUserMsg('Interview prep')
      handleUserIntent('interview')
    } else if (action === 'salary') {
      addUserMsg('Salary advice')
      handleUserIntent('salary')
    } else if (action === 'upload') {
      fileRef.current?.click()
    } else if (action === 'wizard') {
      startWizard()
    } else if (action === 'paste-jd') {
      pasteJD()
    }
  }

  // ── File upload ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    addUserMsg(`Uploaded ${file.name}`)
    const resume = createResumeFromUpload(file.name)
    addResume(resume)
    coachReply(
      `Parsed your resume! You're a <strong>${resume.name}</strong> with skills in ${resume.skills.slice(0, 4).join(', ')}. Score: <strong>${resume.score}%</strong>.<br><br>Here are your company matches:`,
      'matches',
      resume.companies,
      1000,
    )
    if (resume.stretch?.length) {
      setTimeout(() => coachReply(`<strong>Stretch roles</strong> you could grow into:`, 'matches', resume.stretch, 1200), 200)
    }
    e.target.value = ''
  }

  // ── Paste JD flow ──
  const pasteJD = () => {
    addUserMsg('Paste a job posting')
    coachReply(
      `Paste a job description below and I'll analyze it against your resume.<br><br><textarea class="w-full rounded-sm border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground" rows="4" placeholder="Paste job description here..." id="jdPasteArea"></textarea><br><button onclick="window.dispatchEvent(new CustomEvent('jfs-analyze-jd', { detail: document.getElementById('jdPasteArea')?.value }))" class="mt-2 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white">Analyze Match</button>`,
    )
  }

  // ── Wizard flow ──
  const startWizard = () => {
    addUserMsg('Build from template')
    coachReply(
      `<strong>Step 1: What role are you looking for?</strong><br><div class="mt-2 flex flex-wrap gap-1"><span class="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary" onclick="document.getElementById('wizardRole').value='Frontend Developer'">Frontend Developer</span><span class="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary" onclick="document.getElementById('wizardRole').value='Full-Stack Engineer'">Full-Stack Engineer</span><span class="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary" onclick="document.getElementById('wizardRole').value='Product Designer'">Product Designer</span><span class="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary" onclick="document.getElementById('wizardRole').value='Backend Engineer'">Backend Engineer</span></div><br><input id="wizardRole" class="mt-2 w-full rounded-sm border border-border bg-background p-2 text-xs" placeholder="Or type your own role..." /><br><button onclick="window.dispatchEvent(new CustomEvent('jfs-wizard-step1', { detail: (document.getElementById('wizardRole')||{}).value }))" class="mt-2 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white">Next</button>`,
    )
  }

  // ── Listen for custom events from inline HTML ──
  useEffect(() => {
    const handleAnalyzeJD = (e: Event) => {
      const text = (e as CustomEvent).detail as string
      if (!text?.trim()) return
      addUserMsg('Analyze this job posting')
      if (!activeResume) { coachReply('Upload a resume first, then I can analyze job postings against it!'); return }
      const score = Math.floor(Math.random() * 15) + 75
      const found = activeResume.skills.filter((s) => text.toLowerCase().includes(s.toLowerCase()))
      const missing = activeResume.skills.filter((s) => !text.toLowerCase().includes(s.toLowerCase())).slice(0, 3)
      coachReply(
        `I analyzed this posting against your <strong>${activeResume.name}</strong> resume:<br><br><strong>Match: ${score}%</strong><br><br>Skills found in JD: ${found.length > 0 ? found.map((s) => `<span style="color:var(--success);font-weight:600">${s}</span>`).join(', ') : 'none directly'}<br><br>Your skills not mentioned in JD: ${missing.length > 0 ? missing.join(', ') : 'none — great overlap!'}`,
        undefined, undefined, 800,
      )
    }

    const handleWizardStep1 = (e: Event) => {
      const role = (e as CustomEvent).detail as string
      if (!role?.trim()) return
      coachReply(
        `<strong>Step 2: Tell me about yourself</strong><br><input id="wbName" class="mt-2 w-full rounded-sm border border-border bg-background p-2 text-xs" placeholder="John Doe" /><div class="mt-2 flex gap-2"><input id="wbEmail" class="flex-1 rounded-sm border border-border bg-background p-2 text-xs" placeholder="Email" /><input id="wbLoc" class="flex-1 rounded-sm border border-border bg-background p-2 text-xs" placeholder="Location" /></div><input id="wbSummary" class="mt-2 w-full rounded-sm border border-border bg-background p-2 text-xs" placeholder="Summary..." /><button onclick="window.dispatchEvent(new CustomEvent('jfs-wizard-finish', { detail: '${role.replace(/'/g, "\\'")}' }))" class="mt-2 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white">Generate Resume</button>`,
      )
    }

    const handleWizardFinish = (e: Event) => {
      const role = (e as CustomEvent).detail as string
      const nameEl = document.getElementById('wbName') as HTMLInputElement | null
      const emailEl = document.getElementById('wbEmail') as HTMLInputElement | null
      const locEl = document.getElementById('wbLoc') as HTMLInputElement | null
      const summaryEl = document.getElementById('wbSummary') as HTMLInputElement | null

      const resume = createResumeFromWizard({
        role,
        name: nameEl?.value || 'Your Name',
        email: emailEl?.value || '',
        location: locEl?.value || '',
        summary: summaryEl?.value || '',
        company: '',
        companyRole: role,
        dates: '2020 - Present',
        bullets: [],
        skills: [],
      })
      addResume(resume)
      addUserMsg('Generate Resume')
      coachReply(
        `Done! Here's your resume for <strong>${role}</strong>:`,
        'resume',
        resume,
        1000,
      )
      setTimeout(() => coachReply(`And here are your company matches:`, 'matches', resume.companies, 1200), 200)
    }

    const handleFileUpload = (e: Event) => {
      const filename = (e as CustomEvent).detail as string
      addUserMsg(`Uploaded ${filename}`)
    }

    window.addEventListener('jfs-analyze-jd', handleAnalyzeJD as EventListener)
    window.addEventListener('jfs-wizard-step1', handleWizardStep1 as EventListener)
    window.addEventListener('jfs-wizard-finish', handleWizardFinish as EventListener)
    window.addEventListener('jfs-file-upload', handleFileUpload as EventListener)
    window.addEventListener('jfs-start-wizard', () => startWizard())
    window.addEventListener('jfs-paste-jd', () => pasteJD())

    return () => {
      window.removeEventListener('jfs-analyze-jd', handleAnalyzeJD as EventListener)
      window.removeEventListener('jfs-wizard-step1', handleWizardStep1 as EventListener)
      window.removeEventListener('jfs-wizard-finish', handleWizardFinish as EventListener)
      window.removeEventListener('jfs-file-upload', handleFileUpload as EventListener)
    }
  }, [activeResume, addResume, addUserMsg, coachReply])

  // ── All companies for target selector ──
  const allCompanies: Company[] = activeResume ? [...activeResume.companies, ...(activeResume.stretch || [])] : []

  return (
    <div className="flex h-full flex-col">
      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card px-8 py-2.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="label-mono">Active Profile:</span>
          <select
            value={activeResumeId ?? 'none'}
            onChange={(e) => {
              const val = e.target.value
              if (val !== 'none') setActiveResumeId(parseInt(val))
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
          <span className="label-mono">Target Company:</span>
          <select
            value={targetCompanyKey}
            onChange={(e) => setTargetCompanyKey(e.target.value)}
            disabled={!activeResume}
            className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
          >
            <option value="none">General Career Coach</option>
            {allCompanies.map((c) => {
              const key = (c.name + c.role).replace(/\s+/g, '-').toLowerCase()
              return <option key={key} value={key}>{c.name} ({c.role})</option>
            })}
          </select>
        </div>
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-2 pt-6">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {typing && <TypingIndicator />}
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-background px-8 pb-4 pt-2">
        <div className="mx-auto w-full max-w-[680px]">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-card py-1 pl-3 pr-1 focus-within:border-primary">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              placeholder="Ask about jobs, resumes, interviews..."
              className="flex-1 border-none bg-transparent py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground"
              title="Upload resume"
            >
              <Paperclip size={15} />
            </button>
            <button
              onClick={sendChat}
              className="flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/80"
            >
              <Send size={13} /> Send
            </button>
          </div>
          {/* Quick actions */}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.event}
                onClick={() => quickAction(qa.event)}
                className="rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:border-primary hover:text-primary"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
