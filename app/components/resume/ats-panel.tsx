'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ResumeData } from '~/types/resume'
import { analyzeAtsMatch } from '~/lib/ai'

// ─── default keyword list (fallback when AI is unavailable) ───
const FALLBACK_KEYWORDS = [
  'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Cloudflare Workers',
  'Durable Objects', 'WebSockets', 'Figma', 'Git', 'HTML5', 'CSS3',
  'JavaScript', 'Python', 'Docker', 'AWS', 'GraphQL', 'REST', 'CI/CD',
  'Tailwind', 'Next.js', 'Vite', 'Testing', 'Agile', 'Kubernetes',
]

interface AtsResult {
  missing: string[]
  matched: string[]
  score: number
}

interface Props {
  resume: ResumeData | null
  /** If provided, the panel works in "standalone" mode with its own JD textarea */
  standalone?: boolean
  /** External JD text (when used inside editor) */
  jdText?: string
  onJdTextChange?: (text: string) => void
  /** Called when keywords are injected into the resume */
  onInject?: (keywords: string[]) => void
}

export function AtsPanel({
  resume,
  standalone = false,
  jdText: externalJdText,
  onJdTextChange,
  onInject,
}: Props) {
  const [internalJdText, setInternalJdText] = useState('')
  const [aiResult, setAiResult] = useState<AtsResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const jdText = standalone ? internalJdText : (externalJdText || '')
  const setJdText = standalone ? setInternalJdText : (onJdTextChange || (() => {}))

  // Real-time keyword analysis (client-side, no API call)
  const localResult = useMemo<AtsResult>(() => {
    if (!jdText.trim() || !resume) {
      return { missing: [], matched: [], score: 0 }
    }

    const jdLower = jdText.toLowerCase()
    const skills = resume.skills.map(s => s.name || s as unknown as string)

    const matched: string[] = []
    const missing: string[] = []

    FALLBACK_KEYWORDS.forEach(kw => {
      if (jdLower.includes(kw.toLowerCase())) {
        if (skills.some(s => s.toLowerCase().includes(kw.toLowerCase()))) {
          matched.push(kw)
        } else {
          missing.push(kw)
        }
      }
    })

    const total = matched.length + missing.length
    const score = total > 0
      ? Math.min(100, Math.round((matched.length / total) * 35) + 60)
      : 0

    return { missing, matched, score }
  }, [jdText, resume])

  const result = aiResult || localResult

  // AI-powered deep analysis
  const runAiAnalysis = useCallback(async () => {
    if (!resume || !jdText.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const analysis = await analyzeAtsMatch(resume, jdText)
      setAiResult({
        missing: analysis.missingKeywords,
        matched: analysis.matchedKeywords,
        score: analysis.score,
      })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed')
      setAiResult(null)
    } finally {
      setAiLoading(false)
    }
  }, [resume, jdText])

  // Inject missing keywords into the resume
  const handleInject = useCallback(() => {
    if (onInject && result.missing.length > 0) {
      onInject(result.missing)
    }
  }, [result.missing, onInject])

  // Gauge SVG circumference = 220
  const gaugeOffset = result.score > 0 ? 220 - (result.score / 100) * 220 : 220

  const scoreColor =
    result.score >= 85 ? '#22C55E' :
    result.score >= 75 ? '#EAB308' :
    '#EF4444'

  const scoreLabel =
    result.score >= 85 ? 'Excellent Match' :
    result.score >= 75 ? 'Good Match' :
    result.score > 0 ? 'Poor Match' :
    'Scan Pending'

  const scoreDesc =
    result.score >= 85 ? 'High probability of clearing ATS screening.' :
    result.score >= 75 ? 'Inject missing keywords to reach 85%+.' :
    result.score > 0 ? 'Missing critical keyword matches.' :
    'Paste a job description to trigger analysis.'

  return (
    <div className="space-y-4">
      {/* JD Input */}
      {standalone && (
        <div>
          <label className="mb-1.5 block text-caption font-[510] text-text-secondary">
            Job Description
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={5}
            placeholder="Paste target job description here..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150 resize-y"
          />
        </div>
      )}

      {/* Gauge + Score */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r="35"
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="6"
            />
            <circle
              cx="40" cy="40" r="35"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset={gaugeOffset}
              className="transition-all duration-500"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-[510]"
            style={{ color: scoreColor }}
          >
            {result.score}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-[510] text-text-primary" style={{ color: scoreColor }}>
            {scoreLabel}
          </p>
          <p className="text-caption text-text-secondary mt-0.5">{scoreDesc}</p>
        </div>
      </div>

      {/* AI Analysis Button */}
      <button
        onClick={runAiAnalysis}
        disabled={aiLoading || !jdText.trim() || !resume}
        className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-caption font-[510] text-text-secondary hover:bg-hover disabled:opacity-40 transition-all duration-150"
      >
        {aiLoading ? 'Analyzing with AI...' : 'Run Deep AI Analysis'}
      </button>

      {aiError && (
        <p className="text-caption text-danger">{aiError}</p>
      )}

      {/* Keyword Lists */}
      <div className="space-y-2">
        <div>
          <p className="text-caption font-[510] text-text-secondary mb-1.5">
            Missing Keywords ({result.missing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missing.length > 0 ? (
              result.missing.map(kw => (
                <span
                  key={kw}
                  className="inline-flex items-center rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-caption text-danger"
                >
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-caption text-text-tertiary">
                {jdText.trim() ? 'All keywords matched!' : 'None'}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-caption font-[510] text-text-secondary mb-1.5">
            Matched Keywords ({result.matched.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.matched.length > 0 ? (
              result.matched.map(kw => (
                <span
                  key={kw}
                  className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-caption text-success"
                >
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-caption text-text-tertiary">
                {jdText.trim() ? 'No matches yet' : 'None'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inject Button */}
      {result.missing.length > 0 && onInject && (
        <button
          onClick={handleInject}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150"
        >
          Auto-Inject {result.missing.length} Missing Keyword{result.missing.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
