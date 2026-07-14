'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, TrendingUp, TrendingDown, RefreshCw, MessageSquare, AlertTriangle, Check } from 'lucide-react'
import type { InterviewExchange } from '~/types/interview'

interface InterviewSummaryProps {
  exchanges: InterviewExchange[]
  onRestart: () => void
}

export function InterviewSummary({ exchanges, onRestart }: InterviewSummaryProps) {
  const router = useRouter()
  const [prevScore, setPrevScore] = useState<number | null>(null)

  // Calculate average score (out of 10)
  const totalQuestions = exchanges.length
  const avgScore =
    totalQuestions > 0
      ? parseFloat((exchanges.reduce((sum, e) => sum + e.feedback.score, 0) / totalQuestions).toFixed(1))
      : 0

  // Track session storage to show delta improvement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('last_interview_score')
      if (stored) {
        setPrevScore(parseFloat(stored))
      }
      // Save current score as the new "last score"
      if (totalQuestions > 0) {
        localStorage.setItem('last_interview_score', avgScore.toString())
      }
    }
  }, [avgScore, totalQuestions])

  // Aggregate strengths & improvements
  const allStrengths = exchanges.flatMap((e) => e.feedback.strengths || [])
  const allImprovements = exchanges.flatMap((e) => e.feedback.improvements || [])

  // De-duplicate and get top 3 by frequency or just unique list
  const getTopItems = (items: string[], max = 3) => {
    const valid = items.filter((s) => s && typeof s === 'string' && s.trim().length > 0)
    const counts = valid.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([item]) => item)
  }

  const topStrengths = getTopItems(allStrengths)
  const topImprovements = getTopItems(allImprovements)

  // Delta calculation
  let deltaText = 'First session'
  let deltaDirection: 'up' | 'down' | 'flat' = 'flat'

  if (prevScore !== null && totalQuestions > 0) {
    const diff = avgScore - prevScore
    if (diff > 0) {
      deltaText = `+${diff} vs last session`
      deltaDirection = 'up'
    } else if (diff < 0) {
      deltaText = `${diff} vs last session`
      deltaDirection = 'down'
    } else {
      deltaText = 'No change vs last'
      deltaDirection = 'flat'
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-4 md:p-8 bg-background">
      <div className="w-full max-w-[620px] rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success border border-success/10">
            <CheckCircle2 size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Interview Completed</h1>
          <p className="text-xs text-muted-foreground mt-1">Here is a summary of your performance analysis</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-md border border-border bg-background p-3 text-center">
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Questions</div>
            <div className="text-lg font-bold text-foreground">{totalQuestions} Qs</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">answered</div>
          </div>
          
          <div className="rounded-md border border-border bg-background p-3 text-center">
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Avg Score</div>
            <div className="text-lg font-bold text-foreground">{avgScore} / 10</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{Math.round(avgScore * 10)}% match</div>
          </div>

          <div className="rounded-md border border-border bg-background p-3 text-center flex flex-col justify-between items-center">
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Comparison</div>
            <div className="flex items-center gap-1 text-xs font-semibold">
              {deltaDirection === 'up' && <TrendingUp size={14} className="text-success" />}
              {deltaDirection === 'down' && <TrendingDown size={14} className="text-destructive" />}
              <span className={
                deltaDirection === 'up' ? 'text-success' : deltaDirection === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }>
                {deltaText}
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">performance trajectory</div>
          </div>
        </div>

        {/* Key Findings section */}
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="label-mono flex items-center gap-1.5 mb-2 text-success font-semibold text-xs">
              <Check size={14} /> Core Strengths (Top 3)
            </h3>
            {topStrengths.length > 0 ? (
              <ul className="space-y-1.5 bg-success-soft/20 border border-success/10 rounded-md p-3.5">
                {topStrengths.map((str, idx) => (
                  <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">
                    <span className="text-success font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md p-4 text-center">
                Not enough data collected to aggregate strengths.
              </div>
            )}
          </div>

          <div>
            <h3 className="label-mono flex items-center gap-1.5 mb-2 text-warn font-semibold text-xs">
              <AlertTriangle size={14} /> Areas to Work On (Top 3)
            </h3>
            {topImprovements.length > 0 ? (
              <ul className="space-y-1.5 bg-destructive/5 border border-destructive/10 rounded-md p-3.5">
                {topImprovements.map((imp, idx) => (
                  <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">
                    <span className="text-warn font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md p-4 text-center">
                Not enough data collected to aggregate improvement tips.
              </div>
            )}
          </div>
        </div>

        {/* Question-by-Question Breakdown */}
        {exchanges.length > 0 && (
          <div className="mb-6">
            <h3 className="label-mono mb-3 text-foreground font-semibold text-xs">
              Question-by-Question Breakdown
            </h3>
            <div className="space-y-3">
              {exchanges.map((exchange, idx) => (
                <div key={idx} className="rounded-md border border-border bg-background p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {exchange.question.category}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold font-mono ${
                      exchange.feedback.score >= 7 ? 'text-success' :
                      exchange.feedback.score >= 5 ? 'text-warn' : 'text-destructive'
                    }`}>
                      {exchange.feedback.score}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground font-medium leading-relaxed">
                    {exchange.question.question}
                  </p>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-success font-semibold">Strengths</span>
                    <ul className="space-y-0.5 mt-0.5">
                      {(exchange.feedback.strengths || []).map((str, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-success">+</span> {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-warn font-semibold">To Improve</span>
                    <ul className="space-y-0.5 mt-0.5">
                      {(exchange.feedback.improvements || []).map((imp, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-warn">-</span> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-primary font-semibold">Model Answer</span>
                    <p className="text-[10px] text-muted-foreground italic mt-0.5 bg-muted/20 p-2 rounded border border-border/40">
                      &quot;{exchange.feedback.modelAnswer}&quot;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onRestart}
            className="flex-1 cursor-pointer rounded-sm border border-border bg-background hover:bg-muted/50 px-4 py-2.5 text-xs font-medium text-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} /> Practice Again
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="flex-1 cursor-pointer rounded-sm bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <MessageSquare size={13} /> Back to Coach Chat
          </button>
        </div>
      </div>
    </div>
  )
}
