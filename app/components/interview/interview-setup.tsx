'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Brain, FileText, ArrowRight, Loader2, Sparkles, Clock } from 'lucide-react'
import { useAppStore } from '~/lib/store'
import type { InterviewConfig } from '~/types/interview'

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void
  history: any[]
  loadingHistory: boolean
  onViewSession: (session: any) => void
}

export function InterviewSetup({ onStart, history, loadingHistory, onViewSession }: InterviewSetupProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resumes, activeResumeId, setActiveResumeId, pipeline } = useAppStore()

  // Find active resume
  const activeResume = resumes.find((r) => r.id === activeResumeId) || resumes[0]

  const [selectedResumeId, setSelectedResumeId] = useState(activeResume?.id || 'none')
  const currentResume = resumes.find((r) => r.id === selectedResumeId)

  // Target selection state
  // Can be a matched company ID (e.g. index/name) or "custom"
  const [targetSelect, setTargetSelect] = useState('custom')
  const [customCompany, setCustomCompany] = useState('')
  const [customRole, setCustomRole] = useState('')

  // Config parameters
  const [type, setType] = useState<'behavioral' | 'technical' | 'mixed'>('mixed')
  const [difficulty, setDifficulty] = useState<'entry' | 'mid' | 'senior'>('mid')
  const [maxQuestions, setMaxQuestions] = useState<number>(5)

  // Sync state when activeResume changes or mounts
  useEffect(() => {
    if (activeResume) {
      setSelectedResumeId(activeResume.id)
    }
  }, [activeResume])

  // Sync target selector options from URL query parameters (?company=X&role=Y) or pipeline bookmarks
  useEffect(() => {
    const companyParam = searchParams.get('company')
    const roleParam = searchParams.get('role')
    if (companyParam || roleParam) {
      setTargetSelect('custom')
      if (companyParam) setCustomCompany(companyParam)
      if (roleParam) setCustomRole(roleParam)
    } else if (pipeline.bookmark.length > 0) {
      setTargetSelect(pipeline.bookmark[0].key)
    } else {
      setTargetSelect('custom')
    }
  }, [pipeline.bookmark, searchParams])

  if (resumes.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
          <Brain size={24} className="text-muted-foreground/50 animate-pulse" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Create a Resume Profile First</h3>
        <p className="mb-6 max-w-sm text-xs text-muted-foreground">
          To practice targeted mock interviews, you need to upload and parse your resume in the career coach chat first.
        </p>
        <button
          onClick={() => router.push('/chat')}
          className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Go to Coach Chat <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  const handleStart = () => {
    let finalCompany = ''
    let finalRole = ''
    let missingSkills: string[] = []
    let transferableSkills: string[] = []
    let matchScore: number | undefined = undefined

    if (targetSelect === 'custom') {
      finalCompany = customCompany.trim() || 'General Employer'
      finalRole = customRole.trim() || 'Software Engineer'
    } else {
      const matchedJob = pipeline.bookmark.find((j) => j.key === targetSelect)
      if (matchedJob) {
        finalCompany = matchedJob.company
        finalRole = matchedJob.title
        missingSkills = []
        transferableSkills = currentResume?.skills || []
        matchScore = matchedJob.score
      } else {
        finalCompany = 'General Employer'
        finalRole = 'Software Engineer'
      }
    }

    onStart({
      resumeId: selectedResumeId,
      targetCompany: finalCompany,
      targetRole: finalRole,
      type,
      difficulty,
      maxQuestions,
      missingSkills,
      transferableSkills,
      matchScore,
    })
  }

  // Update active resume in store if dropdown changes
  const handleResumeChange = (id: string) => {
    setSelectedResumeId(id)
    setActiveResumeId(id)
  }

  const hasHistory = history.length > 0

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-4 md:p-8 bg-background">
      <div className={`flex flex-col md:flex-row gap-6 w-full ${hasHistory ? 'max-w-[960px]' : 'max-w-[520px]'} items-stretch justify-center`}>
        {/* Left Column: Setup Config Card */}
        <div className="w-full md:max-w-[520px] shrink-0 rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Brain size={20} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Interview Prep</h1>
              <p className="text-xs text-muted-foreground mt-1">Configure your mock interview tailored to your resume gaps</p>
            </div>

            <div className="space-y-4">
              {/* Resume Selection */}
              <div>
                <label className="label-mono mb-1.5 block">1. Select Resume Profile</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => handleResumeChange(e.target.value)}
                  className="w-full cursor-pointer rounded-sm border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.persona || 'No Name'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Company/Position Selection */}
              <div>
                <label className="label-mono mb-1.5 block">2. Target Position & Company</label>
                {pipeline.bookmark.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={targetSelect}
                      onChange={(e) => setTargetSelect(e.target.value)}
                      className="w-full cursor-pointer rounded-sm border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                    >
                      {pipeline.bookmark.map((job) => (
                        <option key={job.key} value={job.key}>
                          {job.company} — {job.title} (Match Score: {job.score}%)
                        </option>
                      ))}
                      <option value="custom">✏️ Practice for another role...</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-sm p-2 mb-2">
                    No bookmarked jobs found. Please bookmark some jobs on the Find Jobs tab, or fill in details below.
                  </div>
                )}

                {/* Custom fields show up if 'custom' is selected or if no matching companies exist */}
                {targetSelect === 'custom' && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 animate-fade-in">
                    <div>
                      <input
                        type="text"
                        value={customCompany}
                        onChange={(e) => setCustomCompany(e.target.value)}
                        placeholder="Company (e.g. Stripe)"
                        className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="Role (e.g. Frontend Engineer)"
                        className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Interview Type Selector */}
              <div>
                <label className="label-mono mb-1.5 block">3. Interview Focus</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['behavioral', 'technical', 'mixed'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`cursor-pointer rounded-sm border px-3 py-2 text-xs font-medium uppercase tracking-wide transition-all ${
                        type === t
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="label-mono mb-1.5 block">4. Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entry', 'mid', 'senior'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`cursor-pointer rounded-sm border px-3 py-2 text-xs font-medium uppercase tracking-wide transition-all ${
                        difficulty === d
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selector */}
              <div>
                <label className="label-mono mb-1.5 block">5. Interview Length</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 5, label: '5 Questions' },
                    { value: 10, label: '10 Questions' },
                    { value: 0, label: 'Until I Stop' },
                  ] as const).map((len) => (
                    <button
                      key={len.value}
                      type="button"
                      onClick={() => setMaxQuestions(len.value)}
                      className={`cursor-pointer rounded-sm border px-3 py-2 text-xs font-medium transition-all ${
                        maxQuestions === len.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full cursor-pointer rounded-sm bg-primary py-2.5 text-xs font-semibold text-primary-foreground tracking-wide uppercase transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 mt-6"
          >
            Start Mock Interview
          </button>
        </div>

        {/* Right Column: Past Attempts History */}
        {hasHistory && (
          <div className="flex-1 rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5 border-b border-border/60 pb-3 mb-4">
              <Clock size={15} className="text-muted-foreground" />
              Past Mock Interviews
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1 scrollbar-thin">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-xs font-mono">
                  <Loader2 size={14} className="animate-spin text-primary" /> Loading history...
                </div>
              ) : (
                history.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onViewSession(session)}
                    className="flex items-center justify-between border border-border/80 bg-background/50 hover:bg-muted/30 hover:border-primary/25 rounded-md p-3.5 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {session.company}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase px-1 border border-border bg-card rounded-xs shrink-0">
                          {session.difficulty}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {session.role} · {session.type} focus
                      </p>
                      <span className="text-[9px] text-muted-foreground/60 font-mono block mt-1">
                        {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pl-3">
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-foreground font-mono">
                          {session.score}/10
                        </div>
                        <span className="text-[9px] text-muted-foreground block font-mono">
                          {session.exchanges ? `${session.exchanges.length} Qs` : ''}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}