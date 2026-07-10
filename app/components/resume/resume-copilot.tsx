'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useAppStore } from '~/lib/store'
import type { Resume } from '~/types/resume'

export function ResumeCopilot({ resume }: { resume: Resume }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { pipeline } = useAppStore()

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/copilot',
    body: {
      resume: {
        name: resume.name,
        persona: resume.persona,
        email: resume.email,
        location: resume.location,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        companies: pipeline.bookmark.map((b) => ({
          name: b.company,
          role: b.title,
          score: b.score,
        })),
      },
    },
  }), [resume, pipeline.bookmark])

  const { messages, status, sendMessage, stop, error } = useChat({ transport })

  const isStreaming = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    if (!text.trim()) return
    sendMessage({ text })
  }

  const topBookmark = pipeline.bookmark[0]

  const suggestions = [
    { label: 'Rewrite summary', prompt: `Rewrite my professional summary to be more impactful. Current: "${resume.summary || 'None'}"` },
    { label: 'Add missing keywords', prompt: `What keywords should I add to match my target companies? Show me exactly where to add them.` },
    { label: 'Improve bullet points', prompt: `Rewrite my experience bullet points using the XYZ formula (Accomplished X as measured by Y by doing Z). Current experience: ${JSON.stringify(resume.experience || [])}` },
    { label: 'Tailor for top match', prompt: `Tailor my resume for ${topBookmark?.company || 'my top bookmarked job'} — ${topBookmark?.title || ''}. What should I change?` },
  ]

  return (
    <div className="flex w-full lg:w-[35%] lg:min-w-[280px] lg:max-w-[360px] flex-col border-t lg:border-t-0 lg:border-l border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-card px-4 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">AI</div>
        <span className="text-xs font-semibold">AI Co-Pilot</span>
        <span className="ml-auto rounded-xs bg-success-soft px-1.5 py-px font-mono text-[9px] font-semibold text-success">
          {isStreaming ? 'Thinking…' : 'Active'}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-background p-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">AI</div>
              <div className="flex-1 pt-0.5">
                <div className="mb-0.5 text-xs font-semibold">Co-Pilot</div>
                <div className="rounded-md border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  Hey! I'm your AI Resume Co-pilot. I can rewrite sections, add keywords, generate bullet points, or tailor your resume for specific companies.
                </div>
              </div>
            </div>
            {/* Suggestion chips */}
            <div className="ml-9 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.prompt)}
                  className="cursor-pointer rounded-xs border border-border bg-card px-2.5 py-1 text-[10px] text-muted-foreground transition-all hover:border-primary hover:text-primary hover:scale-[1.02] active:scale-[0.98]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id} className="mb-3 flex items-start gap-2.5 animate-fade-up" style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}>
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">AI</div>
            )}
            {msg.role === 'user' && (
              <div className="ml-auto flex max-w-[85%] justify-end">
                <div className="rounded-md bg-accent-soft px-3 py-2 text-xs leading-relaxed text-foreground">
                  {msg.parts.map((part, i) => {
                    if (part.type === 'text') return <span key={i}>{part.text}</span>
                    return null
                  })}
                </div>
              </div>
            )}
            {msg.role === 'assistant' && (
              <div className="flex max-w-[85%] flex-col pt-0.5">
                <div className="mb-0.5 text-xs font-semibold">Co-Pilot</div>
                <div className="rounded-md border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed prose prose-sm max-w-none">
                  {msg.parts.map((part, i) => {
                    if (part.type === 'text') return <MarkdownLite key={i} text={part.text} />
                    return null
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="mb-3 flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">AI</div>
            <div className="flex items-center gap-1 pt-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Connection error. Check your API key and try again.
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-1.5 border-t border-border/50 bg-card p-2.5">
        <input
          placeholder="Ask co-pilot to rewrite…"
          className="flex-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const input = e.currentTarget
              handleSend(input.value)
              input.value = ''
            }
          }}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={stop}
            className="cursor-pointer rounded-xs border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-background"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
              handleSend(input.value)
              input.value = ''
            }}
            className="cursor-pointer rounded-xs bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}

// ── Minimal markdown renderer for inline code, bold, and code blocks ──
function MarkdownLite({ text }: { text: string }) {
  // Split by code blocks first
  const segments = text.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith('```')) {
          // Code block
          const code = seg.replace(/^```\w*\n?/, '').replace(/```$/, '')
          return (
            <pre key={i} className="my-1 overflow-x-auto rounded-md border border-border bg-background p-2.5 font-mono text-[10px] leading-relaxed">
              <code>{code}</code>
            </pre>
          )
        }
        // Inline formatting: bold and inline code
        const parts = seg.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={j} className="rounded-xs border border-border bg-background px-1 py-0.5 font-mono text-[10px]">{part.slice(1, -1)}</code>
              }
              return <span key={j}>{part}</span>
            })}
          </span>
        )
      })}
    </>
  )
}
