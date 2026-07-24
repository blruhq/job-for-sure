'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '~/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { Brain, ArrowRight, Loader2, Clock, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useApplications } from '~/hooks/use-apps'
import { useUIStore } from '~/hooks/use-ui'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { notify } from '~/lib/toast'
import { useTranslations } from 'next-intl'
import type { InterviewConfig, InterviewSessionRow } from '~/types/interview'

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void
  history: InterviewSessionRow[]
  loadingHistory: boolean
  onViewSession: (session: InterviewSessionRow) => void
  onDeleteSession?: () => void
}

export function InterviewSetup({ onStart, history, loadingHistory, onViewSession, onDeleteSession }: InterviewSetupProps) {
  const t = useTranslations('interview')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resumes, activeResumeId } = useActiveResume()
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const { data: applications } = useApplications()

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
    } else if ((applications?.bookmark?.length ?? 0) > 0) {
      setTargetSelect(applications?.bookmark[0]?.key ?? 'custom')
    } else {
      setTargetSelect('custom')
    }
  }, [applications?.bookmark, searchParams])

  if (resumes.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well">
          <Brain size={24} className="text-muted-foreground/50 animate-pulse" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Create a Resume Profile First</h3>
        <p className="mb-6 max-w-sm text-xs text-muted-foreground">
          To practice targeted mock interviews, you need to upload and parse your resume in the career coach chat first.
        </p>
        <Button
          variant="default"
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
        >
          Go to Coach Chat <ArrowRight size={14} />
        </Button>
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
      const matchedJob = (applications?.bookmark ?? []).find((j) => j.key === targetSelect)
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
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-4 md:p-8 neuro-surface">
      <div className={`flex flex-col md:flex-row gap-6 w-full ${hasHistory ? 'max-w-[960px]' : 'max-w-[520px]'} items-stretch justify-center`}>
        {/* Left Column: Setup Config Card */}
        <div className="w-full md:max-w-[520px] shrink-0 rounded-lg neuro-card p-6 shadow-sm flex flex-col justify-between">
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
                <label className="label-mono mb-1.5 block">{t('selectResume')}</label>
                <Select
                  value={selectedResumeId}
                  onValueChange={(val) => { if (val) handleResumeChange(val) }}
                >
                  <SelectTrigger className="w-full neuro-inset rounded-sm px-3 py-2 text-xs">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.persona || 'No Name'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Company/Position Selection */}
              <div>
                <label className="label-mono mb-1.5 block">{t('targetPosition')}</label>
                {(applications?.bookmark?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={targetSelect}
                      onValueChange={(val) => { if (val) setTargetSelect(val) }}
                    >
                      <SelectTrigger className="w-full neuro-inset rounded-sm px-3 py-2 text-xs">
                        <SelectValue placeholder="Select a target position" />
                      </SelectTrigger>
                      <SelectContent>
                        {(applications?.bookmark ?? []).map((job) => (
                          <SelectItem key={job.key} value={job.key}>
                            {job.company} — {job.title} (Match Score: {job.score}%)
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">✏️ Practice for another role...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-sm p-2 mb-2">
                    No bookmarked jobs found. Bookmark jobs from the chat, or fill in details below.
                  </div>
                )}

                {/* Custom fields show up if 'custom' is selected or if no matching companies exist */}
                {targetSelect === 'custom' && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 animate-fade-in">
                    <div>
                      <Input
                        value={customCompany}
                        onChange={(e) => setCustomCompany(e.target.value)}
                        placeholder="Company (e.g. Stripe)"
                        className="w-full px-3 py-1.5 text-xs"
                        neumorphic
                      />
                    </div>
                    <div>
                      <Input
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="Role (e.g. Frontend Engineer)"
                        className="w-full px-3 py-1.5 text-xs"
                        neumorphic
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Interview Type Selector */}
              <div>
                <label className="label-mono mb-1.5 block">{t('interviewFocus')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['behavioral', 'technical', 'mixed'] as const).map((item) => (
                    <Button
                      key={item}
                      variant={type === item ? 'default' : 'outline'}
                      type="button"
                      onClick={() => setType(item)}
                      className="px-3 py-2 text-xs font-medium uppercase tracking-wide"
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="label-mono mb-1.5 block">{t('difficultyLevel')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entry', 'mid', 'senior'] as const).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className="px-3 py-2 text-xs font-medium uppercase tracking-wide"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Length Selector */}
              <div>
                <label className="label-mono mb-1.5 block">{t('interviewLength')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 5, label: '5 Questions' },
                    { value: 10, label: '10 Questions' },
                    { value: 0, label: 'Until I Stop' },
                  ] as const).map((len) => (
                    <Button
                      key={len.value}
                      variant={maxQuestions === len.value ? 'default' : 'outline'}
                      type="button"
                      onClick={() => setMaxQuestions(len.value)}
                      className="px-3 py-2 text-xs font-medium"
                    >
                      {len.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
<Button
            variant="default"
            onClick={handleStart}
            className="w-full py-2.5 text-xs font-semibold tracking-wide uppercase shadow-sm flex items-center justify-center gap-1.5 mt-6"
          >
            Start Mock Interview
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* Right Column: Past Attempts History */}
        {hasHistory && (
          <div className="flex-1 rounded-lg neuro-card p-6 shadow-sm flex flex-col min-w-0">
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
                  <Button
                    key={session.id}
                    variant="outline"
                    type="button"
                    className="group flex w-full items-center justify-between p-3.5 text-left"
                    onClick={() => onViewSession(session)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {session.company}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase px-1 border border-border neuro-icon-well rounded-xs shrink-0">
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
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(session.id)
                        }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 rounded-xs p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        title="Delete session"
                      >
                        <Trash2 size={12} />
                      </Button>
                      <ArrowRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            const res = await fetch(`/api/ai/interview/${deleteTarget}`, { method: 'DELETE' })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || 'Failed to delete session')
            }
            // Remove from local history state — we need to call back to parent
            // The parent InterviewView has fetchHistory(), so we just close dialog
            onDeleteSession?.()
            setDeleteTarget(null)
            notify({ message: 'Interview session deleted', type: 'success' })
          } catch (err) {
            notify({ message: err instanceof Error ? err.message : 'Failed to delete session', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Interview Session?"
        description="Remove this mock interview from your history?"
        confirmLabel="Delete Session"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}