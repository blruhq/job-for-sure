'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, User, AlertCircle, Sparkles, Check, ArrowRight, Loader2, Mic, MicOff } from 'lucide-react'
import type { InterviewConfig, InterviewQuestion, InterviewQA, InterviewExchange, BatchEvaluationResult, AnswerFeedback } from '~/types/interview'
import type { Resume } from '~/types/resume'
import { Skeleton } from '~/components/ui/skeleton'

interface InterviewSessionProps {
  config: InterviewConfig
  resume: Resume | null
  onEnd: (exchanges: InterviewExchange[]) => void
}

export function InterviewSession({ config, resume, onEnd }: InterviewSessionProps) {
  const [qaHistory, setQaHistory] = useState<InterviewQA[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState<'idle' | 'question' | 'evaluating'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Speech recognition state
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const answerRef = useRef('')

  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep answerRef in sync with state for speech recognition callback
  useEffect(() => {
    answerRef.current = currentAnswer
  }, [currentAnswer])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Speech Recognition Setup ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = ''

        recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            const base = answerRef.current
            const newAnswer = base + (base && !base.endsWith(' ') ? ' ' : '') + finalTranscript
            setCurrentAnswer(newAnswer)
          }
        }

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // already stopped
        }
      }
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.warn('Failed to start speech recognition:', err)
      }
    }
  }, [isListening])

  // Load first question on mount
  useEffect(() => {
    fetchQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [qaHistory, currentQuestion, loading])

  const fetchQuestion = async () => {
    setLoading('question')
    setError(null)
    setCurrentAnswer('')
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
          previousQuestions: qaHistory.map((qa) => qa.question.question),
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

  // ── Save current Q&A and move to next question ──
  const handleNextQuestion = () => {
    if (!currentQuestion || currentAnswer.trim().length < 20) return

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    const newQA: InterviewQA = {
      question: currentQuestion,
      answer: currentAnswer,
    }

    const updated = [...qaHistory, newQA]
    setQaHistory(updated)

    // Check if we hit the limit
    if (config.maxQuestions > 0 && updated.length >= config.maxQuestions) {
      // Time to evaluate everything
      runBatchEvaluation(updated)
    } else {
      fetchQuestion()
    }
  }

  // ── End early: include current Q&A if answer exists ──
  const handleEndEarly = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    let allQA = qaHistory
    if (currentQuestion && currentAnswer.trim().length >= 20) {
      allQA = [...qaHistory, { question: currentQuestion, answer: currentAnswer }]
    }

    if (allQA.length === 0) {
      onEnd([])
      return
    }

    runBatchEvaluation(allQA)
  }

  // ── Batch evaluation: send ALL Q&A to AI for grading ──
  const runBatchEvaluation = async (allQA: InterviewQA[]) => {
    setLoading('evaluating')
    setError(null)

    try {
      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-evaluate',
          target: {
            company: config.targetCompany,
            role: config.targetRole,
          },
          difficulty: config.difficulty,
          qaPairs: allQA.map((qa) => ({
            question: qa.question.question,
            answer: qa.answer,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to evaluate interview.')
      }

      const result: BatchEvaluationResult = await response.json()

      // Merge evaluations back into Q&A pairs
      const exchanges: InterviewExchange[] = allQA.map((qa, i) => {
        const evaluation = result.evaluations?.find((e) => e.questionIndex === i) || result.evaluations?.[i]
        const feedback: AnswerFeedback = {
          score: evaluation?.score ?? 5,
          strengths: evaluation?.strengths ?? [],
          improvements: evaluation?.improvements ?? [],
          modelAnswer: evaluation?.modelAnswer ?? '',
        }
        return { question: qa.question, answer: qa.answer, feedback }
      })

      onEnd(exchanges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during evaluation.')
      setLoading('idle')
    }
  }

  const isLastQuestion = config.maxQuestions > 0 && qaHistory.length + 1 >= config.maxQuestions

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
              <span>Question {qaHistory.length + (currentQuestion ? 1 : 0)} of {config.maxQuestions}</span>
            ) : (
              <span>Question {qaHistory.length + (currentQuestion ? 1 : 0)} (Unlimited Mode)</span>
            )}
          </div>
          <button
            onClick={handleEndEarly}
            disabled={loading === 'evaluating'}
            className="text-[10px] font-semibold text-destructive hover:opacity-80 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            End & Summarize
          </button>
        </div>
      </div>

      {/* Main scrolling chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[680px] space-y-6">

          {/* 1. History of past Q&A (no scores shown) */}
          {qaHistory.map((qa, idx) => (
            <div key={qa.question.id} className="space-y-4 border-b border-border/40 pb-6 last:border-0 last:pb-0">
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
                    {qa.question.category}
                  </span>
                  {qa.question.tags.map((tag) => (
                    <span key={tag} className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">{qa.question.question}</p>
              </div>

              {/* Historical Answer Card */}
              <div className="flex items-start gap-3 justify-end pl-12">
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground max-w-full">
                  <p className="leading-relaxed whitespace-pre-wrap">{qa.answer}</p>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  <User size={12} />
                </div>
              </div>
            </div>
          ))}

          {/* 2. Loading state for question generation */}
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

          {/* 3. Evaluating state — full-screen loading */}
          {loading === 'evaluating' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Evaluating Your Interview</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Analyzing {qaHistory.length} answer{qaHistory.length !== 1 ? 's' : ''}...
                </p>
              </div>
            </div>
          )}

          {/* 4. Error state with retry */}
          {error && loading !== 'evaluating' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="text-destructive shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-destructive">Error</h4>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                <button
                  onClick={currentQuestion ? handleNextQuestion : fetchQuestion}
                  className="mt-3 cursor-pointer rounded bg-destructive/15 border border-destructive/20 hover:bg-destructive/20 px-3 py-1 text-[10px] font-semibold text-destructive transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* 5. Active Question + Answer Area */}
          {currentQuestion && loading === 'idle' && (
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

              {/* Answer Input Area */}
              <div className="space-y-2">
                <div className="label-mono flex justify-between items-center">
                  <span>Your Answer</span>
                  <span className={currentAnswer.trim().length >= 20 ? 'text-success' : 'text-muted-foreground'}>
                    {currentAnswer.trim().length} chars (min 20)
                  </span>
                </div>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={5}
                  placeholder="Type your response, or click the microphone to speak..."
                  className={`w-full resize-y rounded-sm border bg-background p-3 text-xs outline-none focus:border-primary transition-colors ${
                    isListening ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  }`}
                />

                {/* Input Controls Row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Mic button (only show if speech is supported) */}
                  <div className="flex items-center gap-2">
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`cursor-pointer rounded-sm border px-3 py-1.5 text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                          isListening
                            ? 'border-destructive/30 bg-destructive/10 text-destructive animate-pulse'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff size={12} /> Stop Listening
                          </>
                        ) : (
                          <>
                            <Mic size={12} /> Speak
                          </>
                        )}
                      </button>
                    )}
                    {isListening && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">
                        Listening...
                      </span>
                    )}
                  </div>

                  {/* Next/Submit button */}
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentAnswer.trim().length < 20}
                    className="cursor-pointer rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isLastQuestion ? (
                      <>
                        Finish & Evaluate <Check size={12} />
                      </>
                    ) : (
                      <>
                        Next Question <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll to */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
