'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useUpdateResume, useCreateResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { createResume } from '~/lib/company-data'
import { notify } from '~/lib/toast'
import { Wand2, Download, Copy, Save, Upload, FileText, Loader2, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'

export default function StandaloneCoverLetterPage() {
  const router = useRouter()
  const t = useTranslations('coverLetter')
  const { resumes, activeResumeId, setActiveResumeId } = useActiveResume()
  const { mutate: addResume } = useCreateResume()
  const { mutate: updateResume } = useUpdateResume()

  // Select first resume by default if activeResumeId is not set
  const [selectedResumeId, setSelectedResumeId] = useState(activeResumeId || 'none')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)

  // Mode & Quick fill states
  const [mode, setMode] = useState<'quick' | 'jd'>('quick')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [focus, setFocus] = useState('')
  const [jdText, setJdText] = useState('')
  const [letterText, setLetterText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'th'>('en')
  const [savedLetters, setSavedLetters] = useState<Array<{
    id: string
    company: string | null
    role: string | null
    content: string
    createdAt: string
  }>>([])
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedResume = resumes.find((r) => r.id === selectedResumeId)

  // Sync selectedResumeId when store loads/hydrates
  useEffect(() => {
    if (activeResumeId && selectedResumeId === 'none') {
      setSelectedResumeId(activeResumeId)
    }
  }, [activeResumeId, selectedResumeId])

  // Fetch saved cover letters
  useEffect(() => {
    async function loadLetters() {
      try {
        const res = await fetch('/api/cover-letters')
        if (!res.ok) return
        const data = await res.json()
        setSavedLetters(data)
      } catch {
        // ignore
      }
    }
    loadLetters()
  }, [])

  // Sync letter text from selected resume if it has one already saved
  useEffect(() => {
    if (selectedResume?.coverLetter) {
      setLetterText(selectedResume.coverLetter)
    } else {
      setLetterText('')
    }
    
    // Attempt to extract company and role from existing coverLetterJD if it follows the template
    if (selectedResume?.coverLetterJD) {
      const jd = selectedResume.coverLetterJD
      if (jd.startsWith('Company: ')) {
        const matches = jd.match(/Company: (.*?), Role: (.*?)(?:, Focus: (.*))?$/)
        if (matches) {
          setCompany(matches[1] || '')
          setRole(matches[2] || '')
          setFocus(matches[3] || '')
        }
      } else {
        setJdText(jd)
      }
    } else {
      setCompany('')
      setRole('')
      setFocus('')
      setJdText('')
    }
  }, [selectedResume])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setParsing(true)
    try {
      // Send file to server — server handles text extraction + AI parsing
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to parse resume')
      }
      const parsed = await res.json()

      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        role: parsed.role || 'Software Engineer',
        persona: parsed.name || 'Your Name',
        email: parsed.email,
        location: parsed.location,
        summary: parsed.summary,
        skills: parsed.skills?.length > 0 ? parsed.skills : ['JavaScript', 'Git'],
        experience: parsed.experience?.map((exp: any) => ({
          company: exp.company || '',
          role: exp.role || '',
          dates: exp.dates || '',
          bullets: exp.bullets || [],
        })),
        education: parsed.education?.map((edu: any) => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || '',
          dates: edu.dates || '',
        })),
        projects: parsed.projects?.map((p: any) => ({
          name: p.name || '',
          description: p.description || '',
          techStack: p.techStack || [],
          link: p.link || '',
        })),
        certifications: parsed.certifications?.map((c: any) => ({
          name: c.name || '',
          issuer: c.issuer || '',
          date: c.date || '',
        })),
        languages: parsed.languages?.map((l: any) => ({
          name: l.name || '',
          proficiency: l.proficiency || '',
        })),
        customSections: parsed.customSections?.map((cs: any) => ({
          title: cs.title || '',
          bullets: cs.bullets || [],
          ...(cs.id ? { id: cs.id } : {}),
        })),
      })

      addResume({ id: resume.id, data: resume })
      setSelectedResumeId(resume.id)
      setActiveResumeId(resume.id)
      notify({ message: 'Resume uploaded and processed successfully!', type: 'success' })
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume. Please try again.', type: 'error' })
    } finally {
      setParsing(false)
    }
  }

  const handleGenerate = async () => {
    if (selectedResumeId === 'none' || !selectedResume) {
      notify({ message: 'Please select or upload a resume first.', type: 'info' })
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: selectedResume,
          jdText: mode === 'jd' ? jdText : '',
          company: mode === 'quick' ? company : '',
          role: mode === 'quick' ? role : '',
          focus: mode === 'quick' ? focus : '',
          language: outputLanguage,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate cover letter')
      }

      const data = await res.json()
      if (data.letter) {
        setLetterText(data.letter)
        const jdVal = mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`
        updateResume({ id: selectedResume.id, data: {
          coverLetter: data.letter,
          coverLetterJD: jdVal,
        } })
        // Add to saved letters list
        if (data.id) {
          setActiveLetterId(data.id)
          setSavedLetters(prev => [
            {
              id: data.id,
              company: mode === 'quick' ? company : null,
              role: mode === 'quick' ? role : null,
              content: data.letter,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ])
        }
        notify({ message: 'Cover letter generated & saved!', type: 'success' })
      } else {
        throw new Error('No letter content returned')
      }
    } catch (error) {
      console.error(error)
      notify({ message: 'Failed to generate cover letter. Please try again.', type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (!selectedResume) return
    const jdVal = mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`
    updateResume({ id: selectedResume.id, data: {
      coverLetter: letterText,
      coverLetterJD: jdVal,
    } })
    notify({ message: 'Cover letter saved successfully!', type: 'success' })
  }

  const handleLoadSaved = (letter: { id: string; content: string; company: string | null; role: string | null }) => {
    setActiveLetterId(letter.id)
    setLetterText(letter.content)
    if (letter.company) setCompany(letter.company)
    if (letter.role) setRole(letter.role)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText)
      notify({ message: 'Copied to clipboard!', type: 'success' })
    } catch {
      notify({ message: 'Failed to copy.', type: 'error' })
    }
  }

  return (
    <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.text,.md,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Configuration Column */}
      <div className="w-full lg:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card p-5 flex flex-col gap-4 overflow-y-auto justify-between">
        <div className="space-y-4">
          <div className="text-center pb-2 border-b border-border/50">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">{t('generatorTitle')}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('generatorSubtitle')}</p>
          </div>

          {/* 1. Resume selection */}
          <div className="space-y-2">
            <label className="label-mono block">{t('selectProfile')}</label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value)
                  if (e.target.value !== 'none') setActiveResumeId(e.target.value)
                }}
                className="min-w-0 flex-1 cursor-pointer rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
              >
                <option value="none">{t('selectProfilePlaceholder')}</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.persona || 'No Name'})
                  </option>
                ))}
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-xs border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 disabled:opacity-50"
              >
                {parsing ? (
                  <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                  <>
                    <Upload size={12} /> {t('uploadPdf')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Generation Mode Selector */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="label-mono block">{t('detailsMode')}</label>
            <div className="flex gap-1.5 rounded-sm bg-border/30 p-0.5 shrink-0">
              <button
                onClick={() => setMode('quick')}
                className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
                  mode === 'quick' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('quickFields')}
              </button>
              <button
                onClick={() => setMode('jd')}
                className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
                  mode === 'jd' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('fullJobDescription')}
              </button>
            </div>
          </div>

          {/* 2.5 Language Selector */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="label-mono block">{t('outputLanguage')}</label>
            <div className="flex gap-1.5 rounded-sm bg-border/30 p-0.5 shrink-0">
              <button
                onClick={() => setOutputLanguage('en')}
                className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
                  outputLanguage === 'en' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setOutputLanguage('th')}
                className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
                  outputLanguage === 'th' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ภาษาไทย
              </button>
            </div>
          </div>

          {/* Mode Form Fields */}
          {mode === 'quick' ? (
            <div className="space-y-3">
              <div>
                <label className="label-mono mb-1 block">{t('companyName')}</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('placeholderCompany')}
                  className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="label-mono mb-1 block">Job Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="label-mono mb-1 block">Focus / Highlights (Optional)</label>
                <textarea
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Focus on my dashboard UI leadership..."
                  rows={4}
                  className="w-full resize-none rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary font-sans"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="label-mono mb-1 block">Job Description</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste full target job description here..."
                rows={10}
                className="w-full resize-none rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary font-sans"
              />
            </div>
          )}
        </div>

        {/* Saved Letters */}
        {savedLetters.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <label className="label-mono block">Saved Letters ({savedLetters.length})</label>
            {savedLetters.map((letter) => (
              <div
                key={letter.id}
                className={`group flex items-center gap-1.5 rounded-xs border px-2 py-1.5 cursor-pointer transition-colors ${
                  activeLetterId === letter.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                }`}
                onClick={() => handleLoadSaved(letter)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">
                    {letter.company || letter.role || 'Untitled'}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {new Date(letter.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(letter.id)
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Generate Trigger */}
        <button
          onClick={handleGenerate}
          disabled={
            generating ||
            selectedResumeId === 'none' ||
            (mode === 'quick' && (!company || !role)) ||
            (mode === 'jd' && !jdText)
          }
          className="w-full cursor-pointer rounded-sm bg-primary py-2 text-xs font-semibold text-primary-foreground tracking-wide uppercase transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Wand2 size={13} /> Generate Cover Letter
            </>
          )}
        </button>
      </div>

      {/* Document Preview Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Actions bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!letterText || selectedResumeId === 'none'}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
            >
              <Save size={11} /> Save Letter
            </button>
            <button
              onClick={handleCopy}
              disabled={!letterText}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
            >
              <Copy size={11} /> Copy Text
            </button>
            <button
              onClick={() => window.open(`/api/export/pdf?id=${selectedResumeId}&type=cover-letter`, '_blank')}
              disabled={!letterText || selectedResumeId === 'none'}
              className="flex cursor-pointer items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Download size={11} /> Export PDF
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center items-start">
          {letterText ? (
            <div
              className="resume-paper w-full max-w-[650px] min-h-[800px] rounded-xs p-10 bg-card border border-border flex flex-col shadow-sm animate-fade-up"
              style={{ boxShadow: 'var(--shadow-paper)' }}
            >
              {/* Header layout matching PDF/Resume style */}
              <div className="text-center mb-6">
                <div className="text-base font-bold tracking-tight text-foreground">{selectedResume?.persona || 'Your Name'}</div>
                <div className="mt-1 font-mono text-[9px] text-muted-foreground">
                  {[selectedResume?.email, selectedResume?.location].filter(Boolean).join(' · ')}
                </div>
              </div>
              
              <div className="border-b border-border/50 mb-6"></div>

              {/* Letter Textarea */}
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                placeholder="Your cover letter text will appear here..."
                className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 outline-none text-foreground font-sans text-xs focus:ring-0 focus:outline-none leading-relaxed p-0"
                style={{ fontSize: '11px' }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground/40">
                <FileText size={24} />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">No Cover Letter Generated</h3>
              <p className="text-xs text-muted-foreground">
                Select or upload a resume on the left, type the target company and position details, and click Generate to write your letter.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await fetch(`/api/cover-letters/${deleteTarget}`, { method: 'DELETE' })
            setSavedLetters(prev => prev.filter(l => l.id !== deleteTarget))
            if (activeLetterId === deleteTarget) {
              setActiveLetterId(null)
              setLetterText('')
            }
            setDeleteTarget(null)
            notify({ message: 'Cover letter deleted', type: 'success' })
          } catch {
            notify({ message: 'Failed to delete', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Cover Letter?"
        description="Remove this cover letter from your saved list?"
        confirmLabel="Delete Letter"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
