'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, ChevronUp, ChevronDown, PlusCircle, Lightbulb } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { ResumeCopilot } from '~/components/resume/resume-copilot'
import { CoverLetterEditor } from '~/components/resume/cover-letter-editor'
import { JobSearchPanel } from '~/components/resume/job-search-panel'
import type { ResumeEducation, ResumeProject, ResumeExperience, ResumeCertification, ResumeLanguage, ResumeCustomSection } from '~/types/resume'

// ── Helpers ──

type SectionKey = 'projects' | 'certifications' | 'languages' | 'custom'

const SECTION_LABELS: Record<SectionKey, string> = {
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  custom: 'Custom Section',
}

const SECTION_ICONS: Record<SectionKey, string> = {
  projects: '📦',
  certifications: '📜',
  languages: '🌐',
  custom: '✍️',
}

function detectSectionSuggestions(resume: { summary?: string; skills?: string[]; experience?: ResumeExperience[] }): SectionKey[] {
  const text = [
    resume.summary ?? '',
    ...(resume.skills ?? []),
    ...(resume.experience ?? []).flatMap(e => [e.company, e.role]),
  ].join(' ').toLowerCase()

  const suggestions: SectionKey[] = []
  if (!/(projects?|github|portfolio|app|built|developed|created)/i.test(text) || (text.match(/\b(react|python|typescript|node|docker|api|frontend|backend|full.stack|engineer|developer|software)\b/g)?.length ?? 0) > 2) {
    // Only suggest Projects if tech keywords detected AND no project-like language already
    // Simplified: just suggest if user doesn't have it
  }
  if (/finance|accounting|banking|investment|cfa|cpa|pmp|aws\s+certified|google\s+certified|audit|compliance|risk/i.test(text))
    suggestions.push('certifications')
  if (/bilingual|multilingual|language|fluent|native|thai|chinese|japanese|korean|french|german|spanish/i.test(text) && !/language/i.test(text))
    suggestions.push('languages')
  return suggestions
}

// ── Sub-components ──

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback(() => {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
    }
    setInput('')
    inputRef.current?.focus()
  }, [input, tags, onChange])

  return (
    <div className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] focus-within:border-primary">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5 rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="ml-0.5 cursor-pointer rounded-full hover:bg-primary/20">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
          if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter') : ''}
        className="min-w-[80px] flex-1 border-none bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

function EditableList<T>({
  items,
  onChange,
  renderItem,
  createNew,
  label,
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number, update: (item: T) => void) => React.ReactNode
  createNew: () => T
  label: string
}) {
  const addItem = () => {
    onChange([...items, createNew()])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const copy = [...items]
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    onChange(copy)
  }

  return (
    <div className="border-t border-border/50 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono text-[10px]">{label}</span>
        <button
          type="button"
          onClick={addItem}
          className="flex cursor-pointer items-center gap-0.5 rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="py-2 text-center text-[10px] text-muted-foreground/50 italic">No entries yet. Click "Add" to create one.</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={(item as any).id || i} className="relative rounded-xs border border-border bg-background p-3">
            <div className="absolute right-2 top-2 flex items-center gap-0.5">
              <button type="button" onClick={() => moveItem(i, i - 1)} disabled={i === 0} className="cursor-pointer rounded-xs p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp size={12} />
              </button>
              <button type="button" onClick={() => moveItem(i, i + 1)} disabled={i === items.length - 1} className="cursor-pointer rounded-xs p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown size={12} />
              </button>
              <button type="button" onClick={() => removeItem(i)} className="cursor-pointer rounded-xs p-0.5 text-muted-foreground hover:text-red-500">
                <X size={12} />
              </button>
            </div>
            {renderItem(item, i, (updated) => {
              const copy = [...items]
              copy[i] = updated
              onChange(copy)
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionSuggestionBanner({
  suggestions,
  onAdd,
  onDismiss,
}: {
  suggestions: SectionKey[]
  onAdd: (section: SectionKey) => void
  onDismiss: () => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="mb-3 rounded-xs border border-primary/20 bg-primary/5 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-primary">
        <Lightbulb size={13} />
        Suggestions for your role
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { onAdd(s); onDismiss() }}
            className="flex cursor-pointer items-center gap-1 rounded-xs border border-primary/20 bg-card px-2 py-1 text-[10px] text-foreground hover:bg-primary/10"
          >
            <PlusCircle size={11} /> Add {SECTION_LABELS[s]} {SECTION_ICONS[s]}
          </button>
        ))}
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer rounded-xs px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ── Main component ──

export function ResumeDetail({ resumeId }: { resumeId: string }) {
  const router = useRouter()
  const { getResume, addResume, setActiveResumeId, deleteResume, updateResume } = useAppStore()
  const [tab, setTab] = useState<'jobs' | 'view' | 'editor' | 'cover-letter'>('jobs')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const resume = getResume(resumeId)

  // ── Editor form state ──
  const [editName, setEditName] = useState(resume?.name ?? '')
  const [editPersona, setEditPersona] = useState(resume?.persona ?? '')
  const [editEmail, setEditEmail] = useState(resume?.email ?? '')
  const [editLocation, setEditLocation] = useState(resume?.location ?? '')
  const [editPhone, setEditPhone] = useState(resume?.phone ?? '')
  const [editGithub, setEditGithub] = useState(resume?.github ?? '')
  const [editSummary, setEditSummary] = useState(resume?.summary ?? '')
  const [editSkillsArr, setEditSkillsArr] = useState<string[]>(resume?.skills ?? [])
  const [editExperiences, setEditExperiences] = useState<ResumeExperience[]>(resume?.experience ?? [])
  const [editEducations, setEditEducations] = useState<ResumeEducation[]>(resume?.education ?? [])
  const [editProjectsArr, setEditProjectsArr] = useState<ResumeProject[]>(resume?.projects ?? [])
  const [editCertifications, setEditCertifications] = useState<ResumeCertification[]>(resume?.certifications ?? [])
  const [editLanguages, setEditLanguages] = useState<ResumeLanguage[]>(resume?.languages ?? [])
  const [editCustomSections, setEditCustomSections] = useState<ResumeCustomSection[]>(resume?.customSections ?? [])
  const [optimizing, setOptimizing] = useState(false)
  const [suggestions, setSuggestions] = useState<SectionKey[]>([])
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)
  const [showAddSectionPicker, setShowAddSectionPicker] = useState(false)
  const suggestionAnalysed = useRef(false)

  // Analyse resume for section suggestions (once per editor open)
  useEffect(() => {
    if (tab === 'editor' && !suggestionAnalysed.current && resume) {
      suggestionAnalysed.current = true
      const detected = detectSectionSuggestions(resume)
      setSuggestions(detected.filter((s) => {
        // Only suggest sections user doesn't already have
        if (s === 'certifications') return !resume.certifications?.length
        if (s === 'languages') return !resume.languages?.length
        return false
      }))
    }
  }, [tab, resume])

  // Determine which sections can still be added (not already in use)
  const availableSections: SectionKey[] = (() => {
    if (!resume) return []
    const has: Record<string, boolean> = {}
    if (editProjectsArr.length > 0) has.projects = true
    if (editCertifications.length > 0) has.certifications = true
    if (editLanguages.length > 0) has.languages = true
    const list = (['projects', 'certifications', 'languages'] as SectionKey[]).filter((s) => !has[s])
    // Always allow adding custom sections
    list.push('custom')
    return list
  })()

  const handleAddSection = useCallback((section: SectionKey) => {
    if (section === 'certifications') {
      setEditCertifications((prev) => [...prev, { name: '', issuer: '', date: '' }])
    } else if (section === 'languages') {
      setEditLanguages((prev) => [...prev, { name: '', proficiency: '' }])
    } else if (section === 'custom') {
      setEditCustomSections((prev) => [...prev, { title: 'New Section', bullets: [] }])
    }
    setShowAddSectionPicker(false)
  }, [])

  if (!resume) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Resume not found. <button onClick={() => router.push('/chat')} className="ml-2 text-primary">Back to Chat</button>
      </div>
    )
  }

  const saveChanges = () => {
    updateResume(resume.id, {
      name: editName,
      persona: editPersona,
      email: editEmail,
      location: editLocation,
      phone: editPhone,
      github: editGithub,
      summary: editSummary,
      skills: editSkillsArr,
      experience: editExperiences,
      education: editEducations,
      projects: editProjectsArr,
      certifications: editCertifications,
      languages: editLanguages,
      customSections: editCustomSections,
    })
    notify({ message: 'Resume saved', type: 'success' })
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
            skills: editSkillsArr,
            experience: editExperiences,
          },
          job: 'Optimize this resume for maximum impact in the tech industry. Use strong action verbs, quantify achievements, and ensure the summary is compelling.',
        }),
      })
      if (!res.ok) throw new Error('Optimization failed')
      const data = await res.json()
      if (data.optimized) {
        if (data.optimized.summary) setEditSummary(data.optimized.summary)
        if (data.optimized.skills) setEditSkillsArr(data.optimized.skills)
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
      <div className="flex shrink-0 flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full">
          <button
            onClick={() => router.push('/chat')}
            className="flex shrink-0 items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-background"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="ml-3 flex gap-1 overflow-x-auto rounded-sm bg-border/30 p-0.5">
            {(['jobs', 'view', 'editor', 'cover-letter'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  if (t !== 'editor') suggestionAnalysed.current = false // reset for next open
                  setTab(t)
                }}
                className={cn(
                  'shrink-0 rounded-xs px-3 py-1 text-[11px] font-medium transition-all',
                  tab === t ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'jobs' ? 'Find Jobs' : t === 'view' ? 'View Resume' : t === 'editor' ? 'Resume Editor' : 'Cover Letter'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <h1 className="truncate text-sm font-semibold max-w-[150px] sm:max-w-xs">{resume.name}</h1>
          <span className="rounded-xs bg-success-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-success">{resume.score}% Match</span>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-all"
            title="Delete resume"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Tab 1: Find Jobs ── */}
        {tab === 'jobs' && (
          <JobSearchPanel resume={resume} />
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

              {/* Education */}
              {resume.education && resume.education.length > 0 && (
                <div className="mt-3.5">
                  <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Education</div>
                  {resume.education.map((edu, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between font-semibold">
                        <span>{edu.institution}</span>
                        <span className="font-mono text-[8px] text-muted-foreground">{edu.dates}</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {resume.projects && resume.projects.length > 0 && (
                <div className="mt-3.5">
                  <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Projects</div>
                  {resume.projects.map((proj, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {proj.name}
                          {proj.link && (
                            <span className="ml-1 text-[8px] text-muted-foreground font-normal font-mono">
                              ({proj.link})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mb-1">{proj.description}</div>
                      {proj.techStack && proj.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proj.techStack.map((tech) => (
                            <span key={tech} className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[8px]">{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {resume.certifications && resume.certifications.length > 0 && (
                <div className="mt-3.5">
                  <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Certifications</div>
                  {resume.certifications.map((cert, i) => (
                    <div key={i} className="flex justify-between mb-1 font-semibold">
                      <span>{cert.name} <span className="text-muted-foreground font-normal">({cert.issuer})</span></span>
                      <span className="font-mono text-[8px] text-muted-foreground font-normal">{cert.date}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Languages */}
              {resume.languages && resume.languages.length > 0 && (
                <div className="mt-3.5">
                  <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">Languages</div>
                  <div className="flex flex-wrap gap-3">
                    {resume.languages.map((lang, i) => (
                      <div key={i} className="text-[9px]">
                        <span className="font-semibold">{lang.name}</span>: <span className="text-muted-foreground">{lang.proficiency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Sections */}
              {resume.customSections && resume.customSections.map((sec, i) => (
                <div key={i} className="mt-3.5">
                  <div className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider">{sec.title}</div>
                  <ul className="ml-3 list-disc text-muted-foreground text-[9px] leading-relaxed">
                    {sec.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 3: Resume Editor ── */}
        {tab === 'editor' && (
          <div className="flex w-full flex-col lg:flex-row">
            {/* Form editor */}
            <div className="flex w-full lg:w-[65%] flex-col gap-3 overflow-y-auto border-r border-border p-4 md:p-6">
              {/* Toolbar */}
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

              {/* Form body */}
              <div className="resume-paper flex-1 rounded-xs p-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                <div className="flex flex-col gap-3">

                  {/* Section suggestion banner */}
                  {!suggestionDismissed && (
                    <SectionSuggestionBanner
                      suggestions={suggestions}
                      onAdd={handleAddSection}
                      onDismiss={() => setSuggestionDismissed(true)}
                    />
                  )}

                  {/* Basic Info */}
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
                      <label className="label-mono mb-1 block">Phone</label>
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 555-0123" className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">Location</label>
                      <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="label-mono mb-1 block">GitHub / Portfolio</label>
                      <input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="label-mono mb-1 block">Professional Summary</label>
                    <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full resize-y rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
                  </div>

                  {/* Skills — Tag Input */}
                  <div>
                    <label className="label-mono mb-1 block">Skills</label>
                    <TagInput tags={editSkillsArr} onChange={setEditSkillsArr} placeholder="Type a skill and press Enter" />
                  </div>

                  {/* Work Experience — Dynamic List */}
                  <EditableList<ResumeExperience>
                    items={editExperiences}
                    onChange={setEditExperiences}
                    label="Work Experience"
                    createNew={() => ({ company: '', role: '', dates: '', bullets: [] })}
                    renderItem={(exp, _i, update) => (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Company</label>
                            <input value={exp.company} onChange={(e) => update({ ...exp, company: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Role</label>
                            <input value={exp.role} onChange={(e) => update({ ...exp, role: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="label-mono mb-0.5 block text-[9px]">Dates</label>
                          <input value={exp.dates} onChange={(e) => update({ ...exp, dates: e.target.value })} placeholder="Jun 2020 — Present" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                        </div>
                        <div>
                          <label className="label-mono mb-0.5 block text-[9px]">Highlights (one per line)</label>
                          <textarea
                            value={exp.bullets.join('\n')}
                            onChange={(e) => update({ ...exp, bullets: e.target.value.split('\n').filter(Boolean) })}
                            rows={3}
                            className="w-full resize-y rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    )}
                  />

                  {/* Education — Dynamic List */}
                  <EditableList<ResumeEducation>
                    items={editEducations}
                    onChange={setEditEducations}
                    label="Education"
                    createNew={() => ({ institution: '', degree: '', field: '', dates: '' })}
                    renderItem={(edu, _i, update) => (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Institution</label>
                            <input value={edu.institution} onChange={(e) => update({ ...edu, institution: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Degree</label>
                            <input value={edu.degree} onChange={(e) => update({ ...edu, degree: e.target.value })} placeholder="BS, MBA, PhD" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Field of Study</label>
                            <input value={edu.field} onChange={(e) => update({ ...edu, field: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Dates</label>
                            <input value={edu.dates} onChange={(e) => update({ ...edu, dates: e.target.value })} placeholder="2018 — 2022" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                  />

                  {/* Projects — Dynamic List */}
                  {editProjectsArr.length > 0 && (
                    <EditableList<ResumeProject>
                      items={editProjectsArr}
                      onChange={setEditProjectsArr}
                      label="Projects"
                      createNew={() => ({ name: '', description: '', techStack: [], link: '' })}
                      renderItem={(proj, _i, update) => (
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Project Name</label>
                            <input value={proj.name} onChange={(e) => update({ ...proj, name: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Description</label>
                            <textarea
                              value={proj.description}
                              onChange={(e) => update({ ...proj, description: e.target.value })}
                              rows={2}
                              className="w-full resize-y rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="label-mono mb-0.5 block text-[9px]">Tech Stack</label>
                              <TagInput
                                tags={proj.techStack}
                                onChange={(tags) => update({ ...proj, techStack: tags })}
                                placeholder="React, Node..."
                              />
                            </div>
                            <div className="flex-1">
                              <label className="label-mono mb-0.5 block text-[9px]">Link</label>
                              <input value={proj.link} onChange={(e) => update({ ...proj, link: e.target.value })} placeholder="https://..." className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                            </div>
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {/* Certifications — Dynamic List */}
                  {editCertifications.length > 0 && (
                    <EditableList<ResumeCertification>
                      items={editCertifications}
                      onChange={setEditCertifications}
                      label="Certifications"
                      createNew={() => ({ name: '', issuer: '', date: '' })}
                      renderItem={(cert, _i, update) => (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="label-mono mb-0.5 block text-[9px]">Name</label>
                              <input value={cert.name} onChange={(e) => update({ ...cert, name: e.target.value })} placeholder="AWS Solutions Architect" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                            </div>
                            <div className="flex-1">
                              <label className="label-mono mb-0.5 block text-[9px]">Issuer</label>
                              <input value={cert.issuer} onChange={(e) => update({ ...cert, issuer: e.target.value })} placeholder="Amazon Web Services" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                            </div>
                          </div>
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Date</label>
                            <input value={cert.date} onChange={(e) => update({ ...cert, date: e.target.value })} placeholder="2024" className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {/* Languages — Dynamic List */}
                  {editLanguages.length > 0 && (
                    <EditableList<ResumeLanguage>
                      items={editLanguages}
                      onChange={setEditLanguages}
                      label="Languages"
                      createNew={() => ({ name: '', proficiency: '' })}
                      renderItem={(lang, _i, update) => (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Language</label>
                            <input value={lang.name} onChange={(e) => update({ ...lang, name: e.target.value })} className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="label-mono mb-0.5 block text-[9px]">Proficiency</label>
                            <select
                               value={lang.proficiency}
                               onChange={(e) => update({ ...lang, proficiency: e.target.value })}
                               className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                            >
                               <option value="">Select...</option>
                               <option value="Basic">Basic</option>
                               <option value="Conversational">Conversational</option>
                               <option value="Professional">Professional</option>
                               <option value="Fluent">Fluent</option>
                               <option value="Native">Native</option>
                            </select>
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {/* Custom Sections — Dynamic List */}
                  {editCustomSections.length > 0 && (
                    <EditableList<ResumeCustomSection>
                      items={editCustomSections}
                      onChange={setEditCustomSections}
                      label="Custom Sections"
                      createNew={() => ({ title: 'New Section', bullets: [] })}
                      renderItem={(sec, _i, update) => (
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Section Title</label>
                            <input
                              value={sec.title}
                              onChange={(e) => update({ ...sec, title: e.target.value })}
                              placeholder="e.g. Open Source Contributions"
                              className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Highlights (one per line)</label>
                            <textarea
                              value={sec.bullets.join('\n')}
                              onChange={(e) => update({ ...sec, bullets: e.target.value.split('\n').filter(Boolean) })}
                              rows={3}
                              className="w-full resize-y rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {/* + Add Section button */}
                  {availableSections.length > 0 && (
                    <div className="relative border-t border-border/50 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddSectionPicker(!showAddSectionPicker)}
                        className="flex cursor-pointer items-center gap-1 rounded-xs border border-dashed border-border bg-transparent px-3 py-2 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-all w-full justify-center"
                      >
                        <PlusCircle size={13} /> Add Section
                      </button>
                      {showAddSectionPicker && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xs border border-border bg-card shadow-lg">
                          {availableSections.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                handleAddSection(s)
                                setShowAddSectionPicker(false)
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[11px] text-left text-foreground hover:bg-muted"
                            >
                              <span>{SECTION_ICONS[s]}</span>
                              <span>{SECTION_LABELS[s]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => { if (!deleting) setShowDeleteDialog(false) }}
        onConfirm={async () => {
          setDeleting(true)
          try {
            await deleteResume(resume.id)
            notify({ message: `"${resume.name}" deleted`, type: 'success' })
            router.push('/chat')
          } catch {
            notify({ message: 'Failed to delete resume', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Resume?"
        description={`Remove "${resume.name}"? This action cannot be undone, but you can re-upload your resume anytime.`}
        confirmLabel="Delete Resume"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
