'use client'

import { useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { AgentChat } from '@/components/agent-elements/agent-chat'
import { Paperclip, Upload, FileText, ClipboardList } from 'lucide-react'
import { useAppStore } from '~/lib/store'
import { createResumeFromUpload } from '~/lib/company-data'

const SUGGESTIONS = [
  { id: 'upload', label: 'Upload resume' },
  { id: 'find-jobs', label: 'Find matching jobs' },
  { id: 'interview', label: 'Interview prep' },
  { id: 'salary', label: 'Salary advice' },
]

export function ChatView() {
  const { activeResume, addResume, targetCompanyKey, setTargetCompanyKey, resumes, activeResumeId, setActiveResumeId } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  // Build context for the AI
  const targetCompany = targetCompanyKey !== 'none' && activeResume
    ? [...activeResume.companies, ...(activeResume.stretch || [])].find(
        (c) => (c.name + c.role).replace(/\s+/g, '-').toLowerCase() === targetCompanyKey
      )
    : null

  const { messages, status, sendMessage, stop } = useChat()

  const handleSend = (message: { role: 'user'; content: string }) => {
    sendMessage({ text: message.content })
  }

  const handleSuggestion = (label: string) => {
    if (label === 'Upload resume') {
      fileRef.current?.click()
      return
    }
    sendMessage({ text: label })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resume = createResumeFromUpload(file.name)
    addResume(resume)
    sendMessage({ text: `I just uploaded my resume: ${file.name}. Can you analyze it and find matching companies?` })
    e.target.value = ''
  }

  return (
    <div className="flex h-full flex-col">
      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
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
            {activeResume && [...activeResume.companies, ...(activeResume.stretch || [])].map((c) => {
              const key = (c.name + c.role).replace(/\s+/g, '-').toLowerCase()
              return <option key={key} value={key}>{c.name} ({c.role})</option>
            })}
          </select>
        </div>
      </div>

      {/* Agent Chat — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <AgentChat
          messages={messages}
          status={status}
          onSend={handleSend}
          onStop={stop}
          suggestions={SUGGESTIONS.map((s) => ({
            id: s.id,
            label: s.label,
            onClick: () => handleSuggestion(s.label),
          }))}
          className="h-full"
        />
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
