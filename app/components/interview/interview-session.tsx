'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, User, AlertCircle, Sparkles, Check, ArrowRight, Loader2 } from 'lucide-react'
import type { InterviewConfig, InterviewQuestion, AnswerFeedback, InterviewExchange } from '~/types/interview'
import type { Resume } from '~/types/resume'
import { Skeleton } from '~/components/ui/skeleton'

interface InterviewSessionProps {
  config: InterviewConfig
  resume: Resume | null
  onEnd: (exchanges: InterviewExchange[]) => void
}

export function InterviewSession({ config, resume, onEnd }: InterviewSessionProps) {
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null)
  const [loading, setLoading] = useState<'idle' | 'question' | 'evaluate'>('idle')
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load first question on mount
  useEffect(() => {
    fetchQuestion()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [exchanges, currentQuestion, currentFeedback, loading])

  const fetchQuestion = async () => {
    setLoading('question')
    setError(null)
    setCurrentAnswer('')
    setCurrentFeedback(null)
    setCurrentQuestion(null)

    try {
      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'question',
          resume,
          target: {
            company: config.targetCompany,
            role: config.targetRole,
          },
          config,
          previousQuestions: exchanges.map((e) => e.question.question),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate interview question.')
      }

      const data = await response.json()
      setCurrentQuestion({
        id: Math.random().toString(36).substring(7),
        question: data.question,
        category: data.category || 'technical',
        tags: data.tags || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading('idle')
    }
  }

  const submitAnswer = async () => {
    if (!currentQuestion || currentAnswer.trim().length < 20) return

    setLoading('evaluate')
    setError(null)

    try {
      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          target: {
            company: config.targetCompany,
            role: config.targetRole,
          },
          config,
          question: currentQuestion.question,
          answer: currentAnswer,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to evaluate answer.')
      }

      const data = await response.json()
      setCurrentFeedback({
        score: data.score,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        modelAnswer: data.modelAnswer || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading('idle')
    }
  }

  const handleNext = () => {
    if (!currentQuestion || !currentFeedback) return

    const newExchange: InterviewExchange = {
      question: currentQuestion,
      answer: currentAnswer,
      feedback: currentFeedback,
    }

    const updated = [...exchanges, newExchange]
    setExchanges(updated)

    // Check if we hit the limit
    if (config.maxQuestions > 0 && updated.length >= config.maxQuestions) {
      onEnd(updated)
    } else {
      fetchQuestion()
    }
  }

  const handleEnd = () => {
    if (currentQuestion && currentFeedback) {
      const newExchange: InterviewExchange = {
        question: currentQuestion,
        answer: currentAnswer,
        feedback: currentFeedback,
      }
      onEnd([...exchanges, newExchange])
    } else {
      onEnd(exchanges)
    }
  }

  const isLastQuestion = config.maxQuestions > 0 && exchanges.length + 1 >= config.maxQuestions

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 md:px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded bg-primary/10 p-1 text-primary">
            <Brain size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">
              Mock Interview: {config.targetCompany}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {config.targetRole} · {config.difficulty} · {config.type}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-muted-foreground">
            {config.maxQuestions > 0 ? (
              <span>Question {exchanges.length + (currentQuestion ? 1 : 0)} of {config.maxQuestions}</span>
            ) : (
              <span>Question {exchanges.length + (currentQuestion ? 1 : 0)} (Unlimited Mode)</span>
            )}
          </div>
          <button
            onClick={handleEnd}
            className="text-[10px] font-semibold text-destructive hover:opacity-80 active:scale-95 cursor-pointer"
          >
            End & Summarize
          </button>
        </div>
      </div>

      {/* Main scrolling chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[680px] space-y-6">
          
          {/* 1. History of past questions/answers/feedbacks */}
          {exchanges.map((exchange, idx) => (
            <div key={exchange.question.id} className="space-y-4 border-b border-border/40 pb-6 last:border-0 last:pb-0">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Question {idx + 1}
              </div>
              
              {/* Historical Question Card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                    <Brain size={12} />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {exchange.question.category}
                  </span>
                  {exchange.question.tags.map((tag) => (
                    <span key={tag} className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">{exchange.question.question}</p>
              </div>

              {/* Historical Answer Card */}
              <div className="flex items-start gap-3 justify-end pl-12">
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground max-w-full">
                  <p className="leading-relaxed whitespace-pre-wrap">{exchange.answer}</p>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  <User size={12} />
                </div>
              </div>

              {/* Historical Feedback Card */}
              <div className="rounded-lg border border-border bg-card p-4 ml-6 mr-6">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">AI Score & Feedback</span>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                    <span className="text-[10px] font-bold text-success">Score: {exchange.feedback.score}/10</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] font-mono uppercase text-success font-semibold mb-1">Strengths</h4>
                    <ul className="space-y-1">
                      {exchange.feedback.strengths.map((str, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-success mt-0.5">•</span> {str}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-mono uppercase text-warn font-semibold mb-1">Areas to Improve</h4>
                    <ul className="space-y-1">
                      {exchange.feedback.improvements.map((imp, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-warn mt-0.5">•</span> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-mono uppercase text-primary font-semibold mb-1">Suggested Model Answer</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-sm border border-border/50">
                      "{exchange.feedback.modelAnswer}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 2. Active loading state for question generation */}
          {loading === 'question' && (
            <div className="space-y-3 animate-pulse">
              <Skeleton className="h-4 w-20" />
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          )}

          {/* 3. Error state with retry */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="text-destructive shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-destructive">Error</h4>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                <button
                  onClick={currentQuestion ? submitAnswer : fetchQuestion}
                  className="mt-3 cursor-pointer rounded bg-destructive/15 border border-destructive/20 hover:bg-destructive/20 px-3 py-1 text-[10px] font-semibold text-destructive transition-colors"
                >
                  Retry Operation
                </button>
              </div>
            </div>
          )}

          {/* 4. Active Question + Answer Area */}
          {currentQuestion && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Active Question
              </div>

              {/* Question Card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                    <Brain size={12} />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {currentQuestion.category}
                  </span>
                  {currentQuestion.tags.map((tag) => (
                    <span key={tag} className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-foreground font-semibold leading-relaxed">{currentQuestion.question}</p>
              </div>

              {/* Answer Input Area (only if not evaluated yet) */}
              {!currentFeedback && (
                <div className="space-y-2">
                  <div className="label-mono flex justify-between">
                    <span>Your Answer</span>
                    <span className={currentAnswer.trim().length >= 20 ? 'text-success' : 'text-muted-foreground'}>
                      {currentAnswer.trim().length} chars (min 20)
                    </span>
                  </div>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={loading === 'evaluate'}
                    rows={5}
                    placeholder="Type your response here. Try to structure it using the STAR format (Situation, Task, Action, Result) if behavioral, or explain your technical reasoning clearly..."
                    className="w-full resize-y rounded-sm border border-border bg-background p-3 text-xs outline-none focus:border-primary disabled:opacity-60"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={submitAnswer}
                      disabled={currentAnswer.trim().length < 20 || loading === 'evaluate'}
                      className="cursor-pointer rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading === 'evaluate' ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Evaluating Answer...
                        </>
                      ) : (
                        <>
                          Submit Answer <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Evaluation loading block */}
              {loading === 'evaluate' && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse ml-6 mr-6">
                  <div className="flex justify-between border-b border-border pb-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
              )}

              {/* Active Feedback Card (shown after submission) */}
              {currentFeedback && (
                <div className="space-y-4">
                  {/* Your Submitted Answer */}
                  <div className="flex items-start gap-3 justify-end pl-12">
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground max-w-full">
                      <p className="leading-relaxed whitespace-pre-wrap">{currentAnswer}</p>
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      <User size={12} />
                    </div>
                  </div>

                  {/* Feedback Card */}
                  <div className="rounded-lg border border-border bg-card p-4 ml-6 mr-6">
                    <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-primary" />
                        <span className="text-xs font-semibold text-foreground">AI Score & Feedback</span>
                      </div>
                      <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                        <span className="text-[10px] font-bold text-success">Score: {currentFeedback.score}/10</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-success font-semibold mb-1">Strengths</h4>
                        <ul className="space-y-1">
                          {currentFeedback.strengths.map((str, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-success mt-0.5">•</span> {str}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-warn font-semibold mb-1">Areas to Improve</h4>
                        <ul className="space-y-1">
                          {currentFeedback.improvements.map((imp, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-warn mt-0.5">•</span> {imp}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-primary font-semibold mb-1">Suggested Model Answer</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-sm border border-border/50">
                          "{currentFeedback.modelAnswer}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions to move forward */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleEnd}
                      className="cursor-pointer rounded-sm border border-border bg-background hover:bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors"
                    >
                      End & Summarize
                    </button>
                    <button
                      onClick={handleNext}
                      className="cursor-pointer rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] flex items-center gap-1"
                    >
                      {isLastQuestion ? (
                        <>
                          View Summary <Check size={12} />
                        </>
                      ) : (
                        <>
                          Next Question <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anchor to scroll to */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
