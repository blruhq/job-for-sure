import { MessageSquare, ShieldCheck, KanbanSquare } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI Chat Coach',
    desc: 'Talk to an AI that knows your resume inside out. Get interview prep, salary guidance, and instant keyword analysis in real time.',
    color: 'text-primary',
    bgAccent: 'bg-primary/5',
    borderAccent: 'border-primary/20',
  },
  {
    icon: ShieldCheck,
    title: 'ATS Optimizer',
    desc: 'Paste a job description. Get an instant match score with missing keywords highlighted. Inject them with one click.',
    color: 'text-warn',
    bgAccent: 'bg-warn/5',
    borderAccent: 'border-warn/20',
  },
  {
    icon: KanbanSquare,
    title: 'Application Tracker',
    desc: 'Bookmark jobs, drag them through stages, and see your entire search at a glance — saved, applied, interviewing, offer.',
    color: 'text-success',
    bgAccent: 'bg-success/5',
    borderAccent: 'border-success/20',
  },
]

export function FeaturesBento() {
  const large = FEATURES[0]
  const smalls = FEATURES.slice(1)

  return (
    <section id="features" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Three tools. One workflow.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            From the first upload to the final offer — no spreadsheets, no guesswork.
          </p>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
          {/* Large card — AI Chat Coach */}
          <div
            className={`${large.bgAccent} ${large.borderAccent} row-span-2 flex flex-col justify-between rounded-2xl border p-8 md:p-10 shadow-sm`}
          >
            <div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${large.borderAccent} bg-card ${large.color} shadow-sm`}
              >
                <large.icon size={24} />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-foreground">{large.title}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                {large.desc}
              </p>
            </div>
            {/* Chat mockup — blown up */}
            <div className="mt-8 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <span className="h-10 w-10 rounded-full bg-[#FF5F57]" />
                <span className="h-10 w-10 rounded-full bg-[#FFBD2E]" />
                <span className="h-10 w-10 rounded-full bg-[#27C93F]" />
                <span className="ml-3 text-base font-semibold text-muted-foreground">Career Coach</span>
              </div>
              <div className="space-y-4 p-5">
                {/* AI message */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    AI
                  </div>
                  <div className="max-w-[80%] rounded-xl bg-muted px-4 py-3">
                    <p className="text-sm leading-relaxed text-foreground">
                      Your resume matches <strong>3 of 5</strong> key requirements for{" "}
                      <strong>Senior Frontend Engineer</strong>.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      Missing keywords: <span className="text-warn">TypeScript generics</span>,{" "}
                      <span className="text-warn">Next.js App Router</span>. Let&apos;s tailor them.
                    </p>
                  </div>
                </div>
                {/* User message */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="max-w-[75%] rounded-xl bg-primary/10 px-4 py-3">
                    <p className="text-sm text-foreground">
                      Which keywords should I add first?
                    </p>
                  </div>
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10 text-xs font-bold text-muted-foreground">
                    U
                  </div>
                </div>
                {/* AI typing indicator */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Try the chat <ArrowRight size={14} />
            </Link>
          </div>

          {/* Small cards */}
          {smalls.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className={`${f.bgAccent} ${f.borderAccent} flex flex-col justify-between rounded-2xl border p-8 shadow-sm`}
              >
                <div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border ${f.borderAccent} bg-card ${f.color} shadow-sm`}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                {/* Mini score/tracker mockup */}
                <div className="mt-6 overflow-hidden rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                  {f.title === 'ATS Optimizer' ? (
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Match Score</span>
                        <span className="font-mono font-bold text-primary">84%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[84%] rounded-full bg-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success/70" />
                        Saved (4)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warn/70" />
                        Applied (2)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary/70" />
                        Interview (1)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
