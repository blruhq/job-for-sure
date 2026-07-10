'use client'

import { useRef, useState, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { AgentChat } from '@/components/agent-elements/agent-chat'
import { useAppStore } from '~/lib/store'
import { createResume, companyColor, companyLogo } from '~/lib/company-data'
import { notify } from '~/lib/toast'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { PasteJDModal } from '~/components/chat/paste-jd-modal'
import { SkeletonChatMessage, SkeletonCard } from '~/components/ui/skeleton'
import { extractPdfText } from '~/lib/pdf-parse'
import { Upload, FileText, ClipboardList, Loader2 } from 'lucide-react'

export function ChatView() {
  const { activeResume, addResume, updateResume, targetCompanyKey, setTargetCompanyKey, resumes, activeResumeId, setActiveResumeId } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const { messages, status, sendMessage, stop } = useChat()

  // ── Auto-send pending chat message (from "Coach for Job" button) ──
  useEffect(() => {
    const pending = sessionStorage.getItem('jfs_pending_chat')
    if (pending) {
      sessionStorage.removeItem('jfs_pending_chat')
      sendMessage({ text: pending })
    }
  }, [sendMessage])

  const handleSend = (message: { role: 'user'; content: string }) => {
    sendMessage({ text: message.content })
  }

  // ── UPLOAD RESUME ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setProcessing(true)
    try {
      let text: string

      // Read file based on type
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(file)
      } else {
        text = await readFileAsText(file)
      }

      if (text.trim().length < 20) {
        notify({ message: 'Could not extract enough text from this file. Try the Build from Template option.', type: 'error' })
        setProcessing(false)
        return
      }

      // Send to AI for structured parsing
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) throw new Error('Failed to parse resume')
      const parsed = await res.json()

      // Create resume from parsed data
      const resume = createResume({
        name: parsed.role || file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        persona: parsed.name || 'Your Name',
        email: parsed.email,
        location: parsed.location,
        summary: parsed.summary,
        skills: parsed.skills?.length > 0 ? parsed.skills : ['JavaScript', 'Git'],
        experience: parsed.experience?.map((e: any) => ({
          company: e.company || '',
          role: e.role || '',
          dates: e.dates || '',
          bullets: e.bullets || [],
        })),
      })

      addResume(resume)
      sendMessage({ text: `I just uploaded my resume: ${file.name}. Can you analyze it and find matching companies?` })

      // Fetch AI company matches
      fetchCompanyMatches(resume.id, resume.skills, resume.name, resume.summary, resume.experience)
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to process resume. Try Build from Template instead.', type: 'error' })
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
      sendMessage({ text: `I'm a ${data.role} with skills in ${data.skills.slice(0, 5).join(', ')}. Find me matching companies.` })

      fetchCompanyMatches(resume.id, resume.skills, resume.name, resume.summary, resume.experience)
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
    sendMessage({ text: `Analyze this job posting against my resume (${activeResume.name}). Here's the JD:\n\n${jdText.slice(0, 2000)}` })
  }

  // ── FETCH AI COMPANY MATCHES ──
  const fetchCompanyMatches = async (resumeId: string, skills: string[], role: string, summary?: string, experience?: any[]) => {
    try {
      const res = await fetch('/api/match-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, role, summary, experience }),
      })

      if (!res.ok) throw new Error('Failed to fetch matches')
      const data = await res.json()

      updateResume(resumeId, {
        score: data.score || 0,
        companies: data.direct || [],
        stretch: data.stretch || [],
      })
    } catch (err) {
      console.error('[match-companies] Error:', err)
      notify({ message: 'Could not generate company matches. You can still chat with the AI coach.', type: 'info' })
    }
  }

  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

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
            disabled={!activeResume}
            className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-primary"
          >
            <option value="none">General Career Coach</option>
            {activeResume && [...activeResume.companies, ...(activeResume.stretch || [])].map((c) => {
              const key = (c.name + c.role).replace(/\s+/g, '-').toLowerCase()
              return <option key={key} value={key}>{c.name} ({c.role})</option>
            })}
          </select>
        </div>
      </div>

      {/* Processing skeleton — replaces spinner text with real-looking cards */}
      {processing && (
        <div className="border-b border-border/50 px-4 py-3 md:px-8">
          <div className="mx-auto max-w-[680px] space-y-3">
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
        <AgentChat
          messages={messages}
          status={status}
          onSend={handleSend}
          onStop={stop}
          attachments={{
            onAttach: () => fileRef.current?.click(),
          }}
          suggestions={[
            { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
            { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
            { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
            { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
            { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
          ]}
          className="h-full chat-fade-in"
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.text,.pdf"
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
