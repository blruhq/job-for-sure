'use client'

import { useState, useEffect, Suspense } from 'react'
import { InterviewSetup } from './interview-setup'
import { InterviewSession } from './interview-session'
import { InterviewSummary } from './interview-summary'
import type { InterviewConfig, InterviewExchange } from '~/types/interview'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'

export function InterviewView() {
  const { resumes, activeResumeId } = useAppStore()
  const [phase, setPhase] = useState<'setup' | 'session' | 'summary'>('setup')
  const [config, setConfig] = useState<InterviewConfig | null>(null)
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([])

  // History states
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedPastSession, setSelectedPastSession] = useState<any | null>(null)

  const currentResume = resumes.find((r) => r.id === (config?.resumeId || activeResumeId)) || resumes[0] || null

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/ai/interview')
      if (!res.ok) throw new Error('Failed to fetch history')
      const data = await res.json()
      setHistory(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleStart = (selectedConfig: InterviewConfig) => {
    setConfig(selectedConfig)
    setExchanges([])
    setPhase('session')
  }

  const handleEndSession = async (finalExchanges: InterviewExchange[]) => {
    setExchanges(finalExchanges)
    setPhase('summary')

    if (finalExchanges.length === 0) return

    const avgScore = parseFloat(
      (finalExchanges.reduce((sum, e) => sum + e.feedback.score, 0) / finalExchanges.length).toFixed(1)
    )

    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          resumeId: config?.resumeId,
          company: config?.targetCompany,
          role: config?.targetRole,
          type: config?.type,
          difficulty: config?.difficulty,
          score: avgScore,
          exchanges: finalExchanges,
        }),
      })

      if (!res.ok) throw new Error('Failed to save interview session')
      notify({ message: 'Mock interview session saved!', type: 'success' })
      fetchHistory()
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to auto-save interview session to history', type: 'error' })
    }
  }

  const handleRestart = () => {
    setPhase('setup')
    setConfig(null)
    setExchanges([])
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {phase === 'setup' && (
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          </div>
        }>
          <InterviewSetup
            onStart={handleStart}
            history={history}
            loadingHistory={loadingHistory}
            onViewSession={setSelectedPastSession}
            onDeleteSession={fetchHistory}
          />
        </Suspense>
      )}
      {phase === 'session' && config && (
        <InterviewSession config={config} resume={currentResume} onEnd={handleEndSession} />
      )}
      {phase === 'summary' && (
        <InterviewSummary exchanges={exchanges} onRestart={handleRestart} />
      )}

      {/* Detail Modal for Past Session */}
      {selectedPastSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="flex h-[85vh] w-full max-w-[680px] flex-col rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-fade-up">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Mock Interview Review: {selectedPastSession.company}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedPastSession.role} · {selectedPastSession.difficulty} · {selectedPastSession.type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-success-soft px-2 py-0.5 font-mono text-[10px] font-bold text-success border border-success/15">
                  Score: {selectedPastSession.score}/10
                </span>
                <button
                  onClick={() => setSelectedPastSession(null)}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 text-[10px] hover:bg-muted font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {(selectedPastSession.exchanges || []).map((exchange: any, idx: number) => (
                <div key={idx} className="space-y-3 border-b border-border/40 pb-5 last:border-0 last:pb-0">
                  <div className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">
                    Question {idx + 1}
                  </div>
                  
                  {/* Question */}
                  <div className="rounded-md border border-border bg-background p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {exchange.question?.category}
                      </span>
                      {(exchange.question?.tags || []).map((tag: string) => (
                        <span key={tag} className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs font-semibold leading-relaxed text-foreground">{exchange.question?.question}</p>
                  </div>

                  {/* Answer */}
                  <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-xs leading-relaxed text-foreground pl-4">
                    <span className="font-semibold block text-[10px] text-primary/70 mb-1">Your Answer:</span>
                    <p className="whitespace-pre-wrap">{exchange.answer}</p>
                  </div>

                  {/* Feedback */}
                  <div className="rounded-md border border-border bg-card p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-[10px] font-bold text-foreground">AI Review</span>
                      <span className="text-[10px] font-bold text-success font-mono">Score: {exchange.feedback?.score}/10</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-success font-semibold block mb-0.5">Strengths</span>
                        <ul className="space-y-1">
                          {(exchange.feedback?.strengths || []).map((str: string, i: number) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <span className="text-success">•</span> {str}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase text-warn font-semibold block mb-0.5">Improvements</span>
                        <ul className="space-y-1">
                          {(exchange.feedback?.improvements || []).map((imp: string, i: number) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <span className="text-warn">•</span> {imp}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase text-primary font-semibold block mb-0.5">Model Answer</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/30 p-2 rounded border border-border/40">
                          "{exchange.feedback?.modelAnswer}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}