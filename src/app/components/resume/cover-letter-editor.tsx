'use client'

import { useState, useEffect } from 'react'
import { Wand2, Download, Copy, Save, Trash2 } from 'lucide-react'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'
import type { Resume } from '~/types/resume'

interface CoverLetterEditorProps {
  resume: Resume
  updateResume: (payload: { id: string; data: Partial<Resume> }) => void
}

export function CoverLetterEditor({ resume, updateResume }: CoverLetterEditorProps) {
  const t = useTranslations('coverLetter')
  const [jdText, setJdText] = useState(resume.coverLetterJD || '')
  const [letterText, setLetterText] = useState(resume.coverLetter || '')
  const [generating, setGenerating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Mode & Quick fill states
  const [mode, setMode] = useState<'quick' | 'jd'>('quick')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [focus, setFocus] = useState('')
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'th'>('en')

  // Sync letterText when resume changes
  useEffect(() => {
    if (resume.coverLetter !== undefined) {
      setLetterText(resume.coverLetter)
    }
  }, [resume.coverLetter])

  // Sync jdText when resume changes
  useEffect(() => {
    if (resume.coverLetterJD !== undefined) {
      setJdText(resume.coverLetterJD)
    }
  }, [resume.coverLetterJD])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
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
        updateResume({ id: resume.id, data: {
          coverLetter: data.letter,
          coverLetterJD: mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`,
        } })
        notify({ message: t('generatedSuccess'), type: 'success' })
      } else {
        throw new Error('No letter content returned')
      }
    } catch (error) {
      console.error(error)
      notify({ message: t('generateFailed'), type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    updateResume({ id: resume.id, data: {
      coverLetter: letterText,
      coverLetterJD: mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`,
    } })
    notify({ message: t('savedSuccess'), type: 'success' })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText)
      notify({ message: t('copiedClipboard'), type: 'success' })
    } catch {
      notify({ message: t('copy') + ' failed', type: 'error' })
    }
  }

  return (
    <div className="flex w-full flex-col lg:flex-row overflow-hidden h-full">
      {/* Configuration & Input Panel */}
      <div className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card p-5 flex flex-col gap-4 overflow-y-auto">
        <div className="flex gap-1.5 rounded-sm bg-border/30 p-0.5 mb-1 shrink-0">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
              mode === 'quick' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('quickFill')}
          </button>
          <button
            onClick={() => setMode('jd')}
            className={`flex-1 rounded-xs py-1 text-[10px] font-semibold transition-all cursor-pointer text-center ${
              mode === 'jd' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('jobDescription')}
          </button>
        </div>

        {/* Language Selector */}
        <div className="space-y-1">
          <label className="label-mono mb-1 block text-[10px]">{t('outputLanguage')}</label>
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
              <label className="label-mono mb-1 block">{t('roleTitle')}</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t('placeholderRole')}
                className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block">{t('wordingFocus')}</label>
              <textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder={t('placeholderFocus')}
                rows={4}
                className="w-full resize-none rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary font-sans"
              />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{t('jobDescription')}</h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              Paste the job description below to customize your cover letter.
            </p>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste Job Description here..."
              className="w-full h-56 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary resize-none font-sans"
            />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || (mode === 'quick' && (!company || !role)) || (mode === 'jd' && !jdText)}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Wand2 size={13} className={generating ? "animate-pulse" : ""} />
          {generating ? `${t('generate')}...` : t('generate')}
        </button>
      </div>

      {/* Preview / Edit Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Actions bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('generatedLetter')}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!letterText}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
            >
              <Save size={11} /> {t('save')}
            </button>
            <button
              onClick={handleCopy}
              disabled={!letterText}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
            >
              <Copy size={11} /> {t('copy')}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={!letterText}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:text-red-500 hover:border-red-500/30 disabled:opacity-50 transition-all"
            >
              <Trash2 size={11} /> {t('delete') || 'Delete'}
            </button>
            <button
              onClick={() => window.open(`/api/export/pdf?id=${resume.id}&type=cover-letter`, '_blank')}
              disabled={!letterText}
              className="flex cursor-pointer items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Download size={11} /> {t('download') || 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center items-start">
          <div
            className="resume-paper w-full max-w-[650px] min-h-[800px] rounded-xs p-10 bg-card border border-border flex flex-col shadow-sm"
            style={{ boxShadow: 'var(--shadow-paper)' }}
          >
            {/* Header layout matching PDF/Resume style */}
            <div className="text-center mb-6">
              <div className="text-base font-bold tracking-tight text-foreground">{resume.persona || 'Your Name'}</div>
              <div className="mt-1 font-mono text-[9px] text-muted-foreground">
                {[resume.email, resume.location].filter(Boolean).join(' · ')}
              </div>
            </div>
            
            <div className="border-b border-border/50 mb-6"></div>

            {/* Letter Textarea */}
            <textarea
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              placeholder="Your cover letter text will appear here. You can also type directly in this space to write your own letter..."
              className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 outline-none text-foreground font-sans text-xs focus:ring-0 focus:outline-none leading-relaxed p-0"
              style={{ fontSize: '11px' }}
            />
          </div>
        </div>
      </div>
      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          setLetterText('')
          updateResume({ id: resume.id, data: { coverLetter: '', coverLetterJD: '' } })
          setShowDeleteDialog(false)
          notify({ message: 'Cover letter cleared', type: 'success' })
        }}
        title="Delete Cover Letter?"
        description="Remove the current cover letter from this resume? You can generate a new one anytime."
        confirmLabel="Clear Letter"
        variant="danger"
      />
    </div>
  )
}
