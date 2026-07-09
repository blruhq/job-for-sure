'use client'

import { useState } from 'react'
import { FileText, MessageSquare } from 'lucide-react'
import { ResumeUpload } from '~/components/resume/resume-upload'
import { ChatInterview } from '~/components/resume/chat-interview'

export default function NewResumePage() {
  const [mode, setMode] = useState<'upload' | 'chat' | null>(null)

  if (!mode) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <h1 className="text-h1 text-text-primary text-center">Create Your Resume</h1>
        <p className="mt-2 text-body text-text-secondary text-center">Do you have an existing resume?</p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => setMode('upload')} className="rounded-xl border border-border bg-surface p-5 text-left hover:border-accent hover:shadow-card transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-page flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-body font-[510] text-text-primary">Yes, upload my resume</p>
                <p className="text-body-compact text-text-secondary mt-0.5">Upload PDF, DOCX, or TXT. AI extracts the data.</p>
              </div>
            </div>
          </button>
          <button onClick={() => setMode('chat')} className="rounded-xl border border-border bg-surface p-5 text-left hover:border-accent hover:shadow-card transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-page flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-body font-[510] text-text-primary">No, build from scratch</p>
                <p className="text-body-compact text-text-secondary mt-0.5">Chat with AI. Answer questions about your experience.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      {mode === 'upload' ? <ResumeUpload /> : <ChatInterview />}
    </div>
  )
}
