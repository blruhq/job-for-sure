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
    color: 'text-[var(--warn)]',
    bgAccent: 'bg-[var(--warn)]/5',
    borderAccent: 'border-[var(--warn)]/20',
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
    <section id="features" className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Three tools. One workflow.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the first upload to the final offer — no spreadsheets, no guesswork.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
          {/* Large card — AI Chat Coach */}
          <div
            className={`${large.bgAccent} ${large.borderAccent} row-span-2 flex flex-col justify-between rounded-2xl border p-6 md:p-8`}
          >
            <div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${large.borderAccent} bg-card ${large.color}`}
              >
                <large.icon size={20} />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">{large.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {large.desc}
              </p>
            </div>
            {/* Mini chat mockup */}
            <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
                <span className="h-2 w-2 rounded-full bg-[#FFBD2E]" />
                <span className="h-2 w-2 rounded-full bg-[#27C93F]" />
                <span className="ml-2 text-[10px] text-muted-foreground">Career Coach</span>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    AI
                  </div>
                  <div className="rounded-lg bg-muted px-2.5 py-1.5">
                    <p className="text-[12px] leading-relaxed text-foreground">
                      Your resume matches <strong>3 of 5</strong> requirements. Let&apos;s tailor the
                      missing skills.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 justify-end">
                  <div className="rounded-lg bg-primary/10 px-2.5 py-1.5">
                    <p className="text-[12px] text-foreground">Which keywords am I missing?</p>
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
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
                className={`${f.bgAccent} ${f.borderAccent} flex flex-col justify-between rounded-2xl border p-6`}
              >
                <div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${f.borderAccent} bg-card ${f.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                {/* Mini score/tracker mockup */}
                <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                  {f.title === 'ATS Optimizer' ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Match Score</span>
                        <span className="font-mono font-bold text-primary">84%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[84%] rounded-full bg-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
                        Saved (4)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]/70" />
                        Applied (2)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
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
