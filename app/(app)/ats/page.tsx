'use client'

import { useState } from 'react'
import { AtsPanel } from '~/components/resume/ats-panel'

export default function AtsPage() {
  const [jobDescription, setJobDescription] = useState('')
  const [activeTab, setActiveTab] = useState<'input' | 'ats'>('input')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-text-primary">ATS Optimizer</h1>
      </div>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: JD Input */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-3 py-1.5 transition-colors ${activeTab === 'input' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                >
                  Job Description
                </button>
                <button
                  onClick={() => setActiveTab('ats')}
                  className={`px-3 py-1.5 transition-colors ${activeTab === 'ats' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                >
                  ATS Score
                </button>
              </div>
            </div>
            <label className="mb-2 block font-mono text-[11px] tracking-[0.05em] text-text-tertiary uppercase">
              PASTE JOB DESCRIPTION
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={12}
              className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150 resize-none font-mono text-[13px] leading-relaxed"
            />
            <button
              onClick={() => setActiveTab('ats')}
              disabled={!jobDescription.trim()}
              className="mt-3 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] disabled:opacity-50 transition-all duration-150 shadow-card"
            >
              Analyze Match
            </button>
          </div>

          {/* Resume input area */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <label className="mb-2 block font-mono text-[11px] tracking-[0.05em] text-text-tertiary uppercase">
              YOUR RESUME
            </label>
            <textarea
              placeholder="Paste your resume here or select from your saved resumes..."
              rows={10}
              className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150 resize-none font-mono text-[13px] leading-relaxed"
            />
          </div>
        </div>

        {/* Right: ATS Panel */}
        <div className="flex flex-col">
          <AtsPanel resume={null} standalone jdText={jobDescription} onJdTextChange={setJobDescription} />
        </div>
      </div>
    </div>
  )
}
