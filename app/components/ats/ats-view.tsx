'use client'

import { useState, useMemo } from 'react'
import { Wand2, Upload, FileText, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'

const ALL_KEYWORDS = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Cloudflare Workers', 'Durable Objects', 'WebSockets', 'Figma', 'Git', 'HTML5', 'CSS3']

export function AtsView() {
  const router = useRouter()
  const { resumes, activeResumeId, setActiveResumeId, updateResume } = useAppStore()
  const [jdText, setJdText] = useState('')

  const resume = resumes.find((r) => r.id === activeResumeId)

  // ── Keyword analysis ──
  const { matched, missing, score } = useMemo(() => {
    if (!jdText.trim() || !resume) return { matched: [] as string[], missing: [] as string[], score: 0 }
    const jdLower = jdText.toLowerCase()
    const m: string[] = []
    const miss: string[] = []
    ALL_KEYWORDS.forEach((k) => {
      if (jdLower.includes(k.toLowerCase())) {
        if (resume.skills.some((s) => s.toLowerCase().includes(k.toLowerCase()))) {
          m.push(k)
        } else {
          miss.push(k)
        }
      }
    })
    const total = m.length + miss.length
    const s = total > 0 ? Math.round((m.length / total) * 35) + 60 : 60
    return { matched: m, missing: miss, score: s }
  }, [jdText, resume])

  const gaugeOffset = 220 - (score / 100) * 220
  const gaugeColor = score >= 85 ? 'var(--success)' : score >= 75 ? 'var(--warn)' : 'var(--destructive)'
  const gaugeHeading = score >= 85 ? 'Excellent Match' : score >= 75 ? 'Good Match' : jdText ? 'Poor Match' : 'Scan Pending'
  const gaugeDesc = score >= 85
    ? 'High probability of clearing recruiter ATS screening.'
    : score >= 75
    ? 'Inject missing keywords to reach 85%+ recommended score.'
    : jdText
    ? 'Missing critical technical keyword matches.'
    : 'Paste a job description to trigger ATS analysis.'

  const injectKeywords = () => {
    if (!resume || !jdText.trim()) return
    const jdLower = jdText.toLowerCase()
    const toAdd = ALL_KEYWORDS.filter((k) =>
      jdLower.includes(k.toLowerCase()) &&
      !resume.skills.some((s) => s.toLowerCase().includes(k.toLowerCase()))
    )
    if (toAdd.length > 0) {
      updateResume(resume.id, { skills: [...resume.skills, ...toAdd] })
    }
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Left panel — inputs + analysis */}
      <div className="flex w-full md:w-[45%] flex-col gap-5 overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card p-4 md:p-6">
        <div>
          <h1 className="text-lg font-semibold">ATS Optimizer</h1>
          <div className="text-xs text-muted-foreground">Evaluate and score your resume matches</div>
        </div>

        {/* JD input */}
        <div>
          <label className="label-mono mb-1.5 block">1. Job Description</label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={6}
            placeholder="Paste target job description here..."
            className="w-full resize-y rounded-sm border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
          />
        </div>

        {/* Resume select */}
        <div>
          <label className="label-mono mb-1.5 block">2. Target Resume Profile</label>
          <select
            value={activeResumeId ?? 'none'}
            onChange={(e) => e.target.value !== 'none' && setActiveResumeId(e.target.value)}
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

        {/* Gauge */}
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
              {score}%
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: jdText ? gaugeColor : 'var(--warn)' }}>{gaugeHeading}</h3>
            <p className="text-xs text-muted-foreground">{gaugeDesc}</p>
          </div>
        </div>

        {/* Keyword analysis */}
        <div>
          <div className="label-mono mb-2">Keyword Analysis</div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="label-mono mb-1.5 text-[8px]">Missing Keywords (click to add)</div>
              <div className="flex flex-wrap gap-1.5">
                {missing.length > 0 ? missing.map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      if (resume) {
                        updateResume(resume.id, { skills: [...resume.skills, k] })
                        notify({ message: `Added "${k}" to your skills`, type: 'success' })
                      }
                    }}
                    className="cursor-pointer rounded-full border px-2 py-0.5 text-[11px] transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'var(--danger-soft)', color: 'var(--destructive)', borderColor: 'rgba(220,38,38,0.2)' }}
                  >
                    + {k}
                  </button>
                )) : <span className="text-[11px] text-muted-foreground">None — great match!</span>}
              </div>
            </div>
            <div>
              <div className="label-mono mb-1.5 text-[8px]">Matched Keywords</div>
              <div className="flex flex-wrap gap-1.5">
                {matched.length > 0 ? matched.map((k) => (
                  <span key={k} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'rgba(43,95,69,0.2)' }}>{k}</span>
                )) : <span className="text-[11px] text-muted-foreground">None</span>}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={injectKeywords}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Wand2 size={13} /> Auto-Inject Missing Keywords
        </button>
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
            <div className="mb-3.5">
              <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Summary</div>
              <div className="text-muted-foreground">{resume.summary || `Professional with experience in ${resume.skills.slice(0, 3).join(', ')}.`}</div>
            </div>
            <div className="mb-3.5">
              <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Skills</div>
              <div className="flex flex-wrap gap-1">
                {resume.skills.map((s) => (
                  <span key={s} className={cn(
                    'rounded-xs border border-border bg-background px-1.5 py-0.5 text-[9px]',
                    missing.some((m) => s.toLowerCase().includes(m.toLowerCase())) && 'ring-1 ring-destructive/30',
                  )}>{s}</span>
                ))}
              </div>
            </div>
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
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/chat')}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Upload size={12} /> Upload Resume
              </button>
              <span className="flex items-center text-muted-foreground">
                <ArrowRight size={14} />
              </span>
              <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                Select Profile
              </div>
              <span className="flex items-center text-muted-foreground">
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
