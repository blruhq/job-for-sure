'use client'

import { useState, useEffect } from 'react'
import { Wand2, Download, Copy, Save, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { useCoverLetters, useUpdateCoverLetter } from '~/hooks/use-cover-letters'
import { useTranslations } from 'next-intl'
import type { Resume } from '~/types/resume'

interface CoverLetterEditorProps {
  resume: Resume
}

export function CoverLetterEditor({ resume }: CoverLetterEditorProps) {
  const t = useTranslations('coverLetter')
  const { data: coverLetters = [] } = useCoverLetters()
  const { mutateAsync: updateCoverLetter } = useUpdateCoverLetter()

  // Find the latest cover letter for this resume
  const activeLetter = coverLetters.find((cl) => cl.resumeId === resume.id)

  const [jdText, setJdText] = useState('')
  const [letterText, setLetterText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Mode & Quick fill states
  const [mode, setMode] = useState<'quick' | 'jd'>('quick')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [focus, setFocus] = useState('')
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'th'>('en')

  // Initialize from table record
  useEffect(() => {
    if (activeLetter) {
      setLetterText(activeLetter.content || '')
      if (activeLetter.company) setCompany(activeLetter.company)
      if (activeLetter.role) setRole(activeLetter.role)
      if (activeLetter.jdText) setJdText(activeLetter.jdText)
    } else {
      setLetterText('')
    }
  }, [activeLetter]) // re-init when the letter record changes (including server-side updates)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          resumeId: resume.id,
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

  const handleSave = async () => {
    if (activeLetter?.id) {
      await updateCoverLetter({
        id: activeLetter.id,
        content: letterText,
        company: mode === 'quick' ? company : null,
        role: mode === 'quick' ? role : null,
      })
    } else {
      // No existing record — generate via API to create one, or just save locally
      // The AI route creates a record. For manual save, we create via a direct POST.
      try {
        const res = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeId: resume.id,
            content: letterText,
            company: mode === 'quick' ? company : null,
            role: mode === 'quick' ? role : null,
            jdText: mode === 'jd' ? jdText : null,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
      } catch (err) {
        notify({ message: err instanceof Error ? err.message : 'Failed to save', type: 'error' })
        return
      }
    }
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

  const handleDelete = async () => {
    if (activeLetter?.id) {
      try {
        const res = await fetch(`/api/cover-letters/${activeLetter.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          notify({ message: err.error || 'Failed to delete cover letter', type: 'error' })
          return
        }
      } catch {
        notify({ message: 'Failed to delete cover letter', type: 'error' })
        return
      }
    }
    setLetterText('')
    setShowDeleteDialog(false)
    notify({ message: 'Cover letter cleared', type: 'success' })
  }

  return (
    <div className="flex w-full flex-col lg:flex-row overflow-hidden h-full neuro-surface">
      {/* Configuration & Input Panel */}
      <div className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r neuro-surface p-5 flex flex-col gap-4 overflow-y-auto">
        <div className="flex gap-1.5 rounded-sm neuro-inset p-0.5 mb-1 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setMode('quick')}
            className={`flex-1 rounded-xs py-1 text-[10px] font-semibold text-center ${
              mode === 'quick' ? 'neuro-card text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t('quickFill')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode('jd')}
            className={`flex-1 rounded-xs py-1 text-[10px] font-semibold text-center ${
              mode === 'jd' ? 'neuro-card text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t('jobDescription')}
          </Button>
        </div>

        {/* Language Selector */}
        <div className="space-y-1">
          <label className="label-mono mb-1 block text-[10px]">{t('outputLanguage')}</label>
          <div className="flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setOutputLanguage('en')}
              className={`flex-1 rounded-xs py-1 text-[10px] font-semibold text-center ${
                outputLanguage === 'en' ? 'neuro-card text-foreground' : 'text-muted-foreground'
              }`}
            >
              English
            </Button>
            <Button
              variant="ghost"
              onClick={() => setOutputLanguage('th')}
              className={`flex-1 rounded-xs py-1 text-[10px] font-semibold text-center ${
                outputLanguage === 'th' ? 'neuro-card text-foreground' : 'text-muted-foreground'
              }`}
            >
              ภาษาไทย
            </Button>
          </div>
        </div>

        {mode === 'quick' ? (
          <div className="space-y-3">
            <div>
              <label className="label-mono mb-1 block">{t('companyName')}</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t('placeholderCompany')}
                className="w-full px-3 py-2 text-sm"
                neumorphic
              />
            </div>
            <div>
              <label className="label-mono mb-1 block">{t('roleTitle')}</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t('placeholderRole')}
                className="w-full px-3 py-2 text-sm"
                neumorphic
              />
            </div>
            <div>
              <label className="label-mono mb-1 block">{t('wordingFocus')}</label>
              <Textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder={t('placeholderFocus')}
                rows={4}
                className="w-full resize-none px-3 py-2.5 text-sm font-sans"
                neumorphic
              />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">{t('jobDescription')}</h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              Paste the job description below to customize your cover letter.
            </p>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste Job Description here..."
              className="w-full h-56 px-3 py-2.5 text-sm resize-none font-sans"
              neumorphic
            />
          </div>
        )}

        <Button
          variant="default"
          onClick={handleGenerate}
          disabled={generating || (mode === 'quick' && (!company || !role)) || (mode === 'jd' && !jdText)}
          className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold"
        >
          <Wand2 size={13} className={generating ? "animate-pulse" : ""} />
          {generating ? `${t('generate')}...` : t('generate')}
        </Button>
      </div>

      {/* Preview / Edit Panel */}
      <div className="flex-1 flex flex-col overflow-hidden neuro-surface">
        {/* Actions bar */}
        <div className="flex shrink-0 items-center justify-between neuro-surface px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('generatedLetter')}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!letterText}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
            >
              <Save size={11} /> {t('save')}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!letterText}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
            >
              <Copy size={11} /> {t('copy')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={!letterText}
              className="flex items-center gap-1 px-3 py-1.5 text-sm hover:text-red-500 hover:border-red-500/30"
            >
              <Trash2 size={11} /> {t('delete') || 'Delete'}
            </Button>
            <Button
              variant="default"
              onClick={() => window.open(`/api/export/pdf?id=${resume.id}&type=cover-letter`, '_blank')}
              disabled={!letterText}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium"
            >
              <Download size={11} /> {t('download') || 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center items-start">
          <div
            className="resume-paper w-full max-w-[650px] min-h-[800px] rounded-xs p-10 neuro-card flex flex-col shadow-[0_0_0_1px_var(--border)]"
          >
            {/* Header layout matching PDF/Resume style */}
            <div className="text-center mb-6">
              <div className="text-base font-bold tracking-tight text-foreground">{resume.persona || 'Your Name'}</div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {[resume.email, resume.location].filter(Boolean).join(' · ')}
              </div>
            </div>

            <div className="mb-6"></div>

            {/* Letter Textarea */}
            <Textarea
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              placeholder="Your cover letter text will appear here. You can also type directly in this space to write your own letter..."
              className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 text-foreground font-sans text-sm leading-relaxed p-0 focus:ring-0"
            />
          </div>
        </div>
      </div>
      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Cover Letter?"
        description="Remove the current cover letter from this resume? You can generate a new one anytime."
        confirmLabel="Clear Letter"
        variant="danger"
      />
    </div>
  )
}
