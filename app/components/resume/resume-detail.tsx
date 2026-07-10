'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, MessageSquare, Wand2, ExternalLink, Download } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ResumeCopilot } from '~/components/resume/resume-copilot'
import { CoverLetterEditor } from '~/components/resume/cover-letter-editor'
import type { Company } from '~/types/resume'

function companyKey(c: Company) {
  return (c.name + c.role).replace(/\s+/g, '-').toLowerCase()
}

export function ResumeDetail({ resumeId }: { resumeId: string }) {
  const router = useRouter()
  const { getResume, resumes, addResume, setActiveResumeId, isBookmarked, bookmarkJob, activeResume, toggleBookmark, updateResume } = useAppStore()
  const [tab, setTab] = useState<'jobs' | 'view' | 'editor' | 'cover-letter'>('jobs')
  const [policyFilter, setPolicyFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState(0)
  const [searchFilter, setSearchFilter] = useState('')

  const resume = getResume(resumeId)

  // ── Editor form state (MUST be before early return to keep hook order stable) ──
  const [editName, setEditName] = useState(resume?.name ?? '')
  const [editPersona, setEditPersona] = useState(resume?.persona ?? '')
  const [editEmail, setEditEmail] = useState(resume?.email ?? '')
  const [editLocation, setEditLocation] = useState(resume?.location ?? '')
  const [editSummary, setEditSummary] = useState(resume?.summary ?? '')
  const [editSkills, setEditSkills] = useState((resume?.skills ?? []).join(', '))
  const [optimizing, setOptimizing] = useState(false)

  if (!resume) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Resume not found. <button onClick={() => router.push('/chat')} className="ml-2 text-primary">Back to Chat</button>
      </div>
    )
  }

  // ── Matches with filters ──
  const allMatches: (Company & { type: string })[] = [
    ...resume.companies.map((c) => ({ ...c, type: 'Direct Match' })),
    ...(resume.stretch || []).map((c) => ({ ...c, type: 'Stretch Match' })),
  ]
  const filtered = allMatches.filter((c) => {
    if (policyFilter !== 'all' && c.work !== policyFilter) return false
    if (c.score < scoreFilter) return false
    if (searchFilter) {
      const roleMatch = c.role.toLowerCase().includes(searchFilter)
      const nameMatch = c.name.toLowerCase().includes(searchFilter)
      const missingMatch = (c.missing || []).some((s) => s.toLowerCase().includes(searchFilter))
      const transMatch = (c.transferable || []).some((s) => s.toLowerCase().includes(searchFilter))
      if (!roleMatch && !nameMatch && !missingMatch && !transMatch) return false
    }
    return true
  })

  const saveChanges = () => {
    updateResume(resume.id, {
      name: editName,
      persona: editPersona,
      email: editEmail,
      location: editLocation,
      summary: editSummary,
      skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
    })
    setTab('jobs')
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: {
            name: editName,
            persona: editPersona,
            summary: editSummary,
            skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
            experience: resume.experience || [],
          },
          job: 'Optimize this resume for maximum impact in the tech industry. Use strong action verbs, quantify achievements, and ensure the summary is compelling.',
        }),
      })
      if (!res.ok) throw new Error('Optimization failed')
      const data = await res.json()
      if (data.optimized) {
        if (data.optimized.summary) setEditSummary(data.optimized.summary)
        if (data.optimized.skills) setEditSkills(data.optimized.skills.join(', '))
        notify({ message: 'Resume optimized! Review the changes and click Save.', type: 'success' })
      } else {
        throw new Error('No optimized content returned')
      }
    } catch {
      notify({ message: 'AI optimization failed. Try again or use the Co-Pilot.', type: 'error' })
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with tabs */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-background"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="ml-3 flex gap-1 rounded-sm bg-border/30 p-0.5">
            {(['jobs', 'view', 'editor', 'cover-letter'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-xs px-3 py-1 text-[11px] font-medium transition-all',
                  tab === t ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'jobs' ? 'Recommended Jobs' : t === 'view' ? 'View Resume' : t === 'editor' ? 'Resume Editor' : 'Cover Letter'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{resume.name}</h1>
          <span className="rounded-xs bg-success-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-success">{resume.score}% Match</span>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Tab 1: Recommended Jobs ── */}
        {tab === 'jobs' && (
          <div className="flex w-full">
            {/* Filter sidebar — hidden on mobile */}
            <div className="hidden lg:block w-[220px] shrink-0 overflow-y-auto border-r border-border bg-card p-5">
              <div className="mb-4">
                <div className="label-mono mb-2">Search Skills</div>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value.toLowerCase().trim())}
                  placeholder="Type a skill..."
                  className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
                />
              </div>
              <div className="mb-4">
                <div className="label-mono mb-2">Work Policy</div>
                <div className="flex flex-col gap-1.5">
                  {['all', 'remote', 'hybrid', 'onsite'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPolicyFilter(p)}
                      className={cn(
                        'rounded-xs border px-2.5 py-1.5 text-left text-[11px] transition-all',
                        policyFilter === p
                          ? 'border-primary bg-accent-soft font-semibold text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary',
                      )}
                    >
                      {p === 'all' ? 'All Policies' : `${p.charAt(0).toUpperCase() + p.slice(1)} Only`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-mono mb-2">Min Match Score</div>
                <div className="flex flex-col gap-1.5">
                  {[{ v: 0, l: 'All Scores' }, { v: 80, l: '80%+ Match' }, { v: 90, l: '90%+ Match' }].map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setScoreFilter(s.v)}
                      className={cn(
                        'rounded-xs border px-2.5 py-1.5 text-left text-[11px] transition-all',
                        scoreFilter === s.v
                          ? 'border-primary bg-accent-soft font-semibold text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary',
                      )}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matches list */}
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="mb-3 text-sm font-semibold">Recommended Roles ({filtered.length})</h2>
              <div className="flex flex-col gap-3">
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground">No companies match your filters. Try adjusting them.</div>
                )}
                {filtered.map((c) => {
                  const key = companyKey(c)
                  const bm = isBookmarked(key)
                  return (
                      <div key={key} className="flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary cursor-pointer">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-bold text-white" style={{ background: c.color }}>
                          {c.logo}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center justify-between">
                            <span className="text-[13px] font-semibold">{c.role}</span>
                            <span className={cn(
                              'rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
                              c.score >= 85 ? 'bg-success-soft text-success' : 'bg-warn-soft text-[var(--warn)]',
                            )}>{c.score}% Match</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{c.name}</div>
                          <div className="my-1.5 flex gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-xs border border-border bg-background px-1.5 py-0.5">{c.loc}</span>
                            <span className="rounded-xs border border-border bg-background px-1.5 py-0.5">{c.work.toUpperCase()}</span>
                            <span className="rounded-xs border border-border bg-background px-1.5 py-0.5">{c.salary}</span>
                          </div>
                          {c.missing && c.missing.length > 0 && (
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              <strong className="text-destructive">Missing skills:</strong> {c.missing.join(', ')}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                            <span className="font-mono text-[10px] text-muted-foreground">{c.type}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); bm ? toggleBookmark(key) : bookmarkJob({
                                  key, logo: c.logo, color: c.color, company: c.name, title: c.role,
                                  loc: c.loc, score: c.score, level: c.level, time: 'just now', url: c.url,
                                  resume: resume.name,
                                }) }}
                                className={cn(
                                  'flex cursor-pointer items-center gap-1 rounded-xs border px-2 py-1 text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98]',
                                  bm ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary hover:text-primary',
                                )}
                              >
                                <Bookmark size={11} fill={bm ? 'currentColor' : 'none'} /> {bm ? 'Bookmarked' : 'Bookmark'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); sessionStorage.setItem('jfs_pending_chat', `I want to prepare for the ${c.role} role at ${c.name}. Can you coach me on what to expect and how to stand out?`); router.push('/chat'); }} className="cursor-pointer rounded-xs border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary">
                                Coach for Job
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation()
                                const tailored = { ...resume, id: String(Date.now()), name: `${resume.name} → ${c.name}`, updated: 'just now' }
                                addResume(tailored)
                                setActiveResumeId(tailored.id)
                                router.push(`/resume/${tailored.id}`)
                                notify({ message: `Cloned resume for ${c.name}. Edit it in the Resume Editor.`, type: 'success' })
                              }} className="cursor-pointer rounded-xs border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary">
                                Tailor Resume
                              </button>
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Apply Now <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: View Resume ── */}
        {tab === 'view' && (
          <div className="flex w-full flex-col items-center overflow-y-auto p-6">
            <div className="mb-4 flex w-full max-w-[600px] items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
              <div className="flex items-center gap-2">
                <span className="label-mono mb-0">Style Template:</span>
                <select
                  value={resume.template || 'minimalist'}
                  onChange={(e) => updateResume(resume.id, { template: e.target.value as 'minimalist' | 'modern' | 'classic' })}
                  className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] outline-none focus:border-primary"
                >
                  <option value="minimalist">Minimalist (Georgia)</option>
                  <option value="modern">Modern (Inter)</option>
                  <option value="classic">Classic (Times New Roman)</option>
                </select>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => window.open(`/api/export/pdf?id=${resume.id}`, '_blank')} className="rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground">Export PDF</button>
                <button onClick={() => notify({ message: 'DOCX export coming soon', type: 'info' })} className="rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground">Export DOCX</button>
              </div>
            </div>
            <div className="resume-paper w-full max-w-[600px] min-h-[750px] rounded-xs p-8" style={{ boxShadow: 'var(--shadow-paper)' }}>
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
                    <span key={s} className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[9px]">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Experience</div>
                {(resume.experience || []).map((exp, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between font-semibold">
                      <span>{exp.role}</span>
                      <span className="font-mono text-[8px] text-muted-foreground">{exp.dates}</span>
                    </div>
                    <div className="mb-0.5 text-[9px] italic">{exp.company}</div>
                    <ul className="ml-3 list-disc text-muted-foreground">
                      {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Resume Editor ── */}
        {tab === 'editor' && (
          <div className="flex w-full flex-col lg:flex-row">
            {/* Form editor */}
            <div className="flex w-full lg:w-[65%] flex-col gap-3 overflow-y-auto border-r border-border p-4 md:p-6">
              <div className="flex items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
                <div className="flex gap-2">
                  <button onClick={saveChanges} className="flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                    <Download size={11} /> Save Changes
                  </button>
                  <button onClick={() => {
                    const copy = { ...resume, id: String(Date.now()), name: `${resume.name} (Copy)`, updated: 'just now' }
                    addResume(copy)
                    setActiveResumeId(copy.id)
                    notify({ message: 'Resume cloned', type: 'success' })
                  }} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted">
                    Save as New
                  </button>
                  <button onClick={handleOptimize} disabled={optimizing} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50">
                    <Wand2 size={11} /> {optimizing ? 'Optimizing…' : 'AI Optimize'}
                  </button>
                </div>
              </div>
              <div className="resume-paper flex-1 rounded-xs p-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">Resume Name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">Full Name</label>
                      <input value={editPersona} onChange={(e) => setEditPersona(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">Email</label>
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">Location</label>
                      <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="label-mono mb-1 block">Summary</label>
                    <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full resize-y rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="label-mono mb-1 block">Technical Skills (comma separated)</label>
                    <input value={editSkills} onChange={(e) => setEditSkills(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <div className="label-mono mb-3">Work Experience</div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="label-mono mb-1 block">Company</label>
                        <input defaultValue={resume.experience?.[0]?.company || ''} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                      </div>
                      <div className="flex-1">
                        <label className="label-mono mb-1 block">Job Title</label>
                        <input defaultValue={resume.experience?.[0]?.role || ''} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="label-mono mb-1 block">Dates</label>
                      <input defaultValue={resume.experience?.[0]?.dates || ''} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                    <div className="mt-2">
                      <label className="label-mono mb-1 block">Job Highlights (one per line)</label>
                      <textarea
                        defaultValue={(resume.experience?.[0]?.bullets || []).join('\n')}
                        rows={4}
                        className="w-full resize-y rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Co-Pilot sidebar */}
            <ResumeCopilot resume={resume} />
          </div>
        )}

        {/* ── Tab 4: Cover Letter ── */}
        {tab === 'cover-letter' && (
          <CoverLetterEditor resume={resume} updateResume={updateResume} />
        )}
      </div>
    </div>
  )
}
