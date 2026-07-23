'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { Brain, User, AlertCircle, Sparkles, Check, ArrowRight, Loader2, Mic, MicOff, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import type { InterviewConfig, InterviewQuestion, AnswerFeedback, InterviewExchange } from '~/types/interview'
import type { Resume } from '~/types/resume'
import { Skeleton } from '~/components/ui/skeleton'

// ── SpeechRecognition types (not in TS lib.dom yet) ──
// Minimal permissive shapes — these APIs vary by browser.
type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

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

  // Speech recognition state
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const answerRef = useRef('')
  const locale = useLocale()

  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep answerRef in sync with state for speech recognition callback
  useEffect(() => {
    answerRef.current = currentAnswer
  }, [currentAnswer])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Speech Recognition Setup ──
  const speechLang = locale === 'th' ? 'th-TH' : 'en-US'

  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null
    const w = window as WindowWithSpeech
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = speechLang

    recognition.onresult = (event) => {
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      if (finalTranscript) {
        const base = answerRef.current
        const newAnswer = base + (base && !base.endsWith(' ') ? ' ' : '') + finalTranscript
        setCurrentAnswer(newAnswer)
      }
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      setIsListening(false)
      recognitionRef.current = null // mark instance as dead

      // 'aborted' fires when user clicks Stop — silent, no error message
      if (event.error === 'aborted') return

      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access blocked. Allow microphone permission in your browser and try again.')
      } else if (event.error === 'no-speech') {
        setSpeechError('No speech detected. Try speaking louder or check your microphone.')
      } else if (event.error === 'network') {
        setSpeechError(
          'Speech recognition unavailable — ad blockers, VPNs, or network issues can block it. ' +
          'Try disabling ad blockers for this site, or type your answer instead.'
        )
      } else if (event.error === 'language-not-supported') {
        setSpeechError(`Speech recognition does not support "${speechLang}". Try English.`)
      } else {
        setSpeechError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    return recognition
  }, [speechLang])

  // Detect browser support once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as WindowWithSpeech
      const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
      setSpeechSupported(!!SpeechRecognition)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try { rec.stop() } catch { /* already stopped */ }
        recognitionRef.current = null
      }
    }
  }, [])

  const toggleListening = useCallback(() => {
    // Create a fresh instance if none exists (or previous one errored)
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition()
    }
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser.')
      return
    }

    if (isListening) {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setSpeechError(null) // clear any previous speech error
      } catch (err) {
        console.warn('Failed to start speech recognition:', err)
        recognitionRef.current = null // dead instance, recreate next time
        setSpeechError('Failed to start speech recognition. Try again.')
      }
    }
  }, [isListening, createRecognition])

  // Load first question on mount
  useEffect(() => {
    fetchQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Submit answer for per-question evaluation ──
  const submitAnswer = async () => {
    if (!currentQuestion || currentAnswer.trim().length < 20) return

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

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

  // ── Retry: clear answer and feedback, keep same question ──
  const handleRetry = () => {
    setCurrentAnswer('')
    setCurrentFeedback(null)
    setError(null)
  }

  // ── Save current exchange and move to next question ──
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

  // ── End early: include current exchange if feedback exists ──
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
          <Button
            variant="ghost"
            onClick={handleEnd}
            disabled={loading === 'evaluate'}
            className="text-[10px] font-semibold text-destructive"
          >
            End & Summarize
          </Button>
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
                      &ldquo;{exchange.feedback.modelAnswer}&rdquo;
                    </p>
                  </div>
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

          {/* 3. Error state with retry */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="text-destructive shrink-0 mt-0.5" size={16} />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-destructive">Error</h4>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                <Button
                  variant="outline"
                  onClick={currentQuestion ? submitAnswer : fetchQuestion}
                  className="mt-3 px-3 py-1 text-[10px] font-semibold text-destructive"
                >
                  Retry Operation
                </Button>
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
                  <div className="label-mono flex justify-between items-center">
                    <span>Your Answer</span>
                    <span className={currentAnswer.trim().length >= 20 ? 'text-success' : 'text-muted-foreground'}>
                      {currentAnswer.trim().length} chars (min 20)
                    </span>
                  </div>
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={loading === 'evaluate'}
                    rows={5}
                    placeholder="Type your response, or click the microphone to speak..."
                    className={`w-full resize-y p-3 text-xs ${
                      isListening ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                  />
                  {/* Speech error message */}
                  {speechError && (
                    <div className="flex items-start gap-2 rounded-sm border border-destructive/20 bg-destructive/5 p-2.5">
                      <AlertCircle className="shrink-0 mt-0.5 text-destructive" size={12} />
                      <p className="text-[10px] leading-relaxed text-destructive/90">{speechError}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    {/* Mic Button */}
                    <div className="flex items-center gap-2">
                      {speechSupported && (
                        <Button
                          variant={isListening ? 'destructive' : 'outline'}
                          type="button"
                          onClick={toggleListening}
                          disabled={loading === 'evaluate'}
                          className={`px-3 py-1.5 text-[10px] font-medium flex items-center gap-1.5 ${
                            isListening ? 'animate-pulse' : ''
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
                        </Button>
                      )}
                      {isListening && (
                        <span className="text-[10px] text-muted-foreground animate-pulse">
                          Listening...
                        </span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      variant="default"
                      onClick={submitAnswer}
                      disabled={currentAnswer.trim().length < 20 || loading === 'evaluate'}
                      className="px-4 py-2 text-xs font-medium flex items-center gap-1.5"
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
                    </Button>
                  </div>
                </div>
              )}

              {/* Active Feedback Card (shown after submission) */}
              {currentFeedback && loading === 'idle' && (
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
                          &ldquo;{currentFeedback.modelAnswer}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Try Again + Next Question */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      className="px-4 py-2 text-xs font-medium flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} /> Try Again
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleNext}
                      className="px-4 py-2 text-xs font-medium flex items-center gap-1"
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
                    </Button>
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
