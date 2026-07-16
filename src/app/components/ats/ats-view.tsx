'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Wand2, Upload, FileText, ArrowRight, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { useRouter } from '~/i18n/routing'
import { cn } from '~/lib/utils'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useUpdateResume, useCreateResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { notify } from '~/lib/toast'
import { useTranslations } from 'next-intl'
import type { Resume } from '~/types/resume'

interface AnalysisCategory {
  name: string
  score: number
  evidence: string
}

interface AnalysisResult {
  score: number
  categories: AnalysisCategory[]
  matched: string[]
  missing: string[]
  suggestions: string[]
}

export function AtsView() {
  const router = useRouter()
  const t = useTranslations('ats')
  const { resumes, activeResumeId, activeResume, setActiveResumeId } = useActiveResume()
  const { mutate: updateResume } = useUpdateResume()
  const { mutate: addResume } = useCreateResume()
  const setPendingTailor = useUIStore((s) => s.setPendingTailor)
  const [jdText, setJdText] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [tailoringLoading, setTailoringLoading] = useState(false)
  const [hasAnalysedJd, setHasAnalysedJd] = useState(false)

  const resume = activeResume

  // ── Fetching analysis from API ──
  const fetchAnalysis = useCallback(async (jd: string) => {
    if (!resume) return
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/ai/ats-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jdText: jd }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setAnalysisResult(data)
      setHasAnalysedJd(!!jd && jd.trim().length > 0)
    } catch (err) {
      console.error('[ats] Error:', err)
      notify({ message: 'Failed to analyze resume. Please try again.', type: 'error' })
    } finally {
      setAnalysisLoading(false)
    }
  }, [resume])

  // ── Mount check for sessionStorage job context (pre-fill only, no auto-run) ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pendingJd = sessionStorage.getItem('jfs_pending_ats_jd')
    const pendingCompany = sessionStorage.getItem('jfs_pending_ats_company')
    const pendingRole = sessionStorage.getItem('jfs_pending_ats_role')

    if (pendingJd) {
      setJdText(pendingJd)
      sessionStorage.removeItem('jfs_pending_ats_jd')
      sessionStorage.removeItem('jfs_pending_ats_company')
      sessionStorage.removeItem('jfs_pending_ats_role')

      const comp = pendingCompany || 'Target Company'
      const role = pendingRole || 'Target Role'
      notify({ message: `Loaded details for ${role} at ${comp}. Click "Analyze Match" to start.`, type: 'info' })
    }
  }, [])

  // ── Tailor Resume using API ──
  const handleTailor = async () => {
    if (!resume || !jdText.trim()) return
    setTailoringLoading(true)
    try {
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          job: {
            title: 'Target Position',
            company: 'Target Company',
            description: jdText,
          },
        }),
      })
      if (!res.ok) throw new Error('Tailoring failed')
      const { optimized, changes } = await res.json()

      // Build the optimized resume object (preserving fields AI doesn't touch)
      const optimizedResume: Resume = {
        ...resume,
        summary: optimized.summary,
        skills: optimized.skills,
        experience: optimized.experience?.map((e: any, idx: number) => {
          const original = resume.experience?.[idx]
          return {
            company: e.company || original?.company || '',
            role: e.role || original?.role || '',
            dates: e.dates || original?.dates || '',
            bullets: e.bullets || original?.bullets || [],
          }
        }) || resume.experience || [],
      }

      // Store the pending tailor result and navigate to editor in review mode
      const acceptedIds = new Set<string>(changes.map((c: any) => c.id))
      setPendingTailor({
        baseResumeId: resume.id,
        baseResume: resume,
        optimized: optimizedResume,
        changes: changes,
        accepted: acceptedIds,
        jobContext: {
          company: 'Target Company',
          title: 'Target Position',
        },
      })

      notify({ message: 'AI tailored your resume. Review the changes.', type: 'success' })
      router.push(`/resume/${resume.id}?mode=review`)
    } catch (err) {
      console.error('[tailor] Error:', err)
      notify({ message: 'Failed to tailor resume. Please try again.', type: 'error' })
    } finally {
      setTailoringLoading(false)
    }
  }

  // ── Clear JD and reset analysis ──
  const handleClearJd = () => {
    setJdText('')
    setHasAnalysedJd(false)
    setAnalysisResult(null)
  }

  const score = analysisResult?.score || 0

  const gaugeColor = analysisResult
    ? score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warn)' : 'var(--destructive)'
    : 'var(--border)'

  const gaugeOffset = analysisResult ? 220 - (220 * score) / 100 : 220

  const gaugeHeading = analysisResult
    ? hasAnalysedJd
      ? score >= 75 ? 'Strong Match' : score >= 50 ? 'Partial Match' : 'Weak Match'
      : score >= 75 ? 'Excellent Health' : score >= 50 ? 'Good Baseline' : 'Needs Optimization'
    : 'Awaiting Analysis'

  const gaugeDesc = analysisResult
    ? hasAnalysedJd
      ? score >= 75 ? 'Your resume strongly aligns with this job description.' : score >= 50 ? 'Some requirements are missing. Review gaps below.' : 'Significant gap. Tailor your resume for better odds.'
      : score >= 75 ? 'Your resume format and impact language are highly competitive.' : score >= 50 ? 'Good baseline score, but we found a few critical improvements.' : 'High priority issues detected in format or language.'
    : 'Paste a job description and click "Analyze Match" to see your score.'

  const injectKeywords = () => {
    if (!resume || !analysisResult) {
      notify({ message: 'Select a resume first', type: 'warning' })
      return
    }
    const missingKeys = analysisResult.missing || []
    if (missingKeys.length === 0) {
      notify({ message: 'No missing keywords to inject', type: 'info' })
      return
    }
    
    let addedCount = 0
    const nextSkills = [...resume.skills]
    missingKeys.forEach((k) => {
      if (!nextSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()))) {
        nextSkills.push(k)
        addedCount++
      }
    })
    
    if (addedCount > 0) {
      updateResume({ id: resume.id, data: { skills: nextSkills } })
      notify({ message: `Injected ${addedCount} missing keyword${addedCount !== 1 ? 's' : ''}`, type: 'success' })
      // Trigger a re-analysis with current state to refresh
      fetchAnalysis(jdText)
    } else {
      notify({ message: 'Keywords already present in skills list', type: 'info' })
    }
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Left panel — inputs + analysis */}
      <div className="flex w-full md:w-[45%] flex-col gap-5 overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card p-4 md:p-6">
        <div>
          <h1 className="text-lg font-semibold">ATS Optimizer</h1>
          <div className="text-xs text-muted-foreground">
            {hasAnalysedJd ? 'Real-time job matching and keyword analysis' : 'Baseline resume audit and formatting report'}
          </div>
        </div>

        {/* Resume select */}
        <div>
          <label className="label-mono mb-1.5 block">{t('targetResume')}</label>
          <select
            value={activeResumeId ?? 'none'}
            onChange={(e) => {
              if (e.target.value !== 'none') {
                setActiveResumeId(e.target.value)
                setAnalysisResult(null)
              }
            }}
            disabled={resumes.length === 0}
            className="w-full rounded-sm border border-border bg-background py-1.5 pl-2.5 pr-8 text-xs outline-none focus:border-primary"
          >
            {resumes.length === 0 ? (
              <option value="none">None (Upload first)</option>
            ) : (
              resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))
            )}
          </select>
        </div>

        {/* JD input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-mono block">{t('jobDescription')}</label>
            {jdText && (
              <button onClick={handleClearJd} className="text-[10px] text-destructive hover:underline cursor-pointer">
                Clear & Show General Health
              </button>
            )}
          </div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={6}
            placeholder="Paste the job description you want to match against (optional)"
            className="w-full resize-y rounded-sm border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => fetchAnalysis(jdText)}
              disabled={analysisLoading || !resume || !jdText.trim()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {analysisLoading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Wand2 size={13} />
              )}
              Analyze Match
            </button>
            <button
              onClick={() => fetchAnalysis('')}
              disabled={analysisLoading || !resume}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-background disabled:opacity-40"
              title="Run a general resume health check without a job description"
            >
              Health Check
            </button>
          </div>
          {!jdText.trim() && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Paste a job description above for a tailored match score, or click "Health Check" for a general audit.
            </p>
          )}
        </div>

        {/* Gauge / Score Output */}
        <div className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="35" fill="none"
                stroke={gaugeColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray="220"
                strokeDashoffset={gaugeOffset}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 200ms' }}
              />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-base font-semibold">
              {analysisLoading ? '...' : `${score}%`}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: analysisResult ? gaugeColor : 'var(--warn)' }}>
              {analysisLoading ? 'Analyzing...' : gaugeHeading}
            </h3>
            <p className="text-xs text-muted-foreground">{analysisLoading ? 'AI is processing your resume format and context...' : gaugeDesc}</p>
          </div>
        </div>

        {/* Category breakdown (multi-dimensional audit) */}
        {analysisResult?.categories && (
          <div className="rounded-md border border-border p-4 bg-background flex flex-col gap-3">
            <div className="label-mono text-[9px] uppercase tracking-wider text-muted-foreground">Scoring Categories</div>
            {analysisResult.categories.map((cat) => (
              <div key={cat.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{cat.name}</span>
                  <span>{cat.score}%</span>
                </div>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.score}%`,
                      backgroundColor: cat.score >= 75 ? 'var(--success)' : cat.score >= 50 ? 'var(--warn)' : 'var(--destructive)'
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground leading-relaxed">{cat.evidence}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actionable suggestions */}
        {analysisResult?.suggestions && analysisResult.suggestions.length > 0 && (
          <div>
            <div className="label-mono mb-2">Recommended Improvements</div>
            <div className="flex flex-col gap-2">
              {analysisResult.suggestions.map((sug, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground bg-accent-soft p-2.5 rounded-sm border border-border/50">
                  <AlertCircle size={14} className="text-warn shrink-0 mt-0.5" />
                  <span>{sug}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyword Gaps analysis */}
        {analysisResult && (
          <div>
            <div className="label-mono mb-2">{t('keywordAnalysis')}</div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="label-mono mb-1.5 text-[8px]">
                  {hasAnalysedJd ? 'Missing Keywords from JD (click to add)' : 'Identified Weaknesses'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.missing && analysisResult.missing.length > 0 ? (
                    analysisResult.missing.map((k) => (
                      <button
                        key={k}
                        onClick={() => {
                          if (resume) {
                            const nextSkills = [...resume.skills]
                            if (!nextSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()))) {
                              updateResume({ id: resume.id, data: { skills: [...nextSkills, k] } })
                              notify({ message: `Added "${k}" to your skills`, type: 'success' })
                              fetchAnalysis(jdText)
                            }
                          }
                        }}
                        className="cursor-pointer rounded-full border px-2 py-0.5 text-[11px] transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'var(--danger-soft)', color: 'var(--destructive)', borderColor: 'rgba(220,38,38,0.2)' }}
                      >
                        + {k}
                      </button>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-success" /> Fully matched baseline requirements!
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="label-mono mb-1.5 text-[8px]">
                  {hasAnalysedJd ? 'Matched Keywords from JD' : 'Strong Areas'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.matched && analysisResult.matched.length > 0 ? (
                    analysisResult.matched.map((k) => (
                      <span
                        key={k}
                        className="rounded-full border px-2 py-0.5 text-[11px]"
                        style={{ background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'rgba(43,95,69,0.2)' }}
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground">None identified yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tailor Resume Action Card (Visible when JD is analyzed) */}
        {hasAnalysedJd && (
          <div className="mt-2 rounded-md border border-primary/20 bg-accent-soft p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-foreground">Tailor Resume for this Job</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                  AI will adapt your summary, skills order, and experience achievements to align with this job description while preserving all factual data.
                </p>
              </div>
            </div>
            <button
              onClick={handleTailor}
              disabled={tailoringLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {tailoringLoading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              {tailoringLoading ? 'Rewriting Resume...' : 'Tailor Resume with AI'}
            </button>
          </div>
        )}
      </div>

      {/* Right panel — live resume preview */}
      <div className="flex w-full md:w-[55%] flex-col items-center overflow-y-auto bg-background p-4 md:p-6">
        <div className="mb-4 flex w-full max-w-[550px] items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
          <span className="text-[11px] font-semibold text-muted-foreground">ATS Real-Time Sheet</span>
          <button
            onClick={() => {
              if (activeResumeId) {
                router.push(`/resume/${activeResumeId}`)
                notify({ message: 'Switch to Editor tab to make changes', type: 'info' })
              } else {
                notify({ message: 'Select a resume first', type: 'warning' })
              }
            }}
            className="rounded-sm border border-border bg-card px-2 py-1 text-[11px] hover:bg-background"
          >
            Edit Resume Based on ATS
          </button>
        </div>
        {resume ? (
          <div className="resume-paper w-full max-w-[550px] min-h-[650px] rounded-xs p-6" style={{ boxShadow: 'var(--shadow-paper)' }}>
            <div className="text-center text-base font-bold">{resume.persona || 'Your Name'}</div>
            <div className="mb-3 text-center font-mono text-[9px] text-muted-foreground">
              {resume.email || 'john@email.com'} · {resume.location || 'San Francisco, CA'}
            </div>
            {resume.summary && (
              <div className="mb-3.5">
                <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Summary</div>
                <div className="text-muted-foreground text-[10px] leading-relaxed">{resume.summary}</div>
              </div>
            )}
            <div className="mb-3.5">
              <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Skills</div>
              <div className="flex flex-wrap gap-1">
                {resume.skills.map((s) => (
                  <span key={s} className={cn(
                    'rounded-xs border border-border bg-background px-1.5 py-0.5 text-[9px]',
                    analysisResult?.missing?.some((m) => s.toLowerCase().includes(m.toLowerCase())) && 'ring-1 ring-destructive/30',
                  )}>{s}</span>
                ))}
              </div>
            </div>
            {resume.experience && resume.experience.length > 0 && (
              <div className="mb-3.5">
                <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Experience</div>
                <div className="flex flex-col gap-3">
                  {resume.experience.map((exp, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span>{exp.role} at {exp.company}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{exp.dates}</span>
                      </div>
                      <ul className="list-disc pl-3 text-muted-foreground text-[9px] leading-relaxed">
                        {exp.bullets.map((b, bidx) => (
                          <li key={bidx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
              <FileText size={24} className="text-muted-foreground/50" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">No resume selected</h3>
            <p className="mb-4 max-w-xs text-xs text-muted-foreground">
              Select a resume from the dropdown or upload one in chat, then paste a job description to get an ATS match score.
            </p>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => router.push('/chat')}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Upload size={12} /> Upload Resume
              </button>
              <span className="hidden items-center text-muted-foreground sm:flex">
                <ArrowRight size={14} />
              </span>
              <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                Select Profile
              </div>
              <span className="hidden items-center text-muted-foreground sm:flex">
                <ArrowRight size={14} />
              </span>
              <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                Paste JD
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}