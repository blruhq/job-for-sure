import { Brain, Sparkles, Target, CheckCircle, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'

export function InterviewSection() {
  return (
    <section id="interview" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
          {/* ── Left: Copy ── */}
          <div className="max-w-lg">
            {/* Badge */}
            <div className="mb-4 flex w-fit items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1">
              <Brain size={13} className="text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Mock Interview
              </span>
            </div>

            <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-[3rem] md:leading-[1.05]">
              Walk into every
              <br />
              interview confident.
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Practice with AI that knows your resume. Questions are tailored to your skills, target
              role, and experience level — not generic canned questions.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                {
                  icon: Target,
                  text: 'Questions tailored to your resume and target company',
                },
                {
                  icon: Sparkles,
                  text: 'AI scores your answers 1–10 with specific strengths & gaps',
                },
                {
                  icon: CheckCircle,
                  text: 'Compare against a model answer written by AI',
                },
                {
                  icon: Brain,
                  text: 'Behavioral, technical, or mixed — entry to senior level',
                },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon size={13} />
                  </div>
                  <span className="text-sm leading-relaxed text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/interview"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Start Mock Interview <ArrowRight size={14} />
              </Link>
              <Link
                href="/chat"
                className="inline-flex cursor-pointer items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
              >
                Build Your Resume First
              </Link>
            </div>
          </div>

          {/* ── Right: Mockup ── */}
          <div className="relative w-full max-w-lg justify-self-end">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-paper">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                <span className="ml-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Brain size={12} className="text-primary" />
                  Mock Interview — Stripe
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* Question counter */}
                <div className="animate-fade-up text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [animation-delay:200ms] [animation-fill-mode:backwards]">
                  Question 3 of 5
                </div>

                {/* AI question card */}
                <div className="animate-fade-up rounded-lg border border-border bg-muted/20 p-4 [animation-delay:400ms] [animation-fill-mode:backwards]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                      <Brain size={12} />
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      Technical
                    </span>
                    <span className="text-[9px] text-muted-foreground">#react #performance</span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-foreground">
                    &ldquo;Explain how React&rsquo;s reconciliation algorithm works. How would you
                    optimize a component that re-renders unnecessarily? Give a concrete example.&rdquo;
                  </p>
                </div>

                {/* User answer */}
                <div className="animate-fade-up flex items-start gap-3 justify-end pl-10 [animation-delay:600ms] [animation-fill-mode:backwards]">
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
                    <p className="text-xs leading-relaxed text-foreground">
                      React uses a diffing algorithm that compares the virtual DOM tree with the
                      previous one. It reconciles by comparing element types — if the type changes,
                      it unmounts and remounts; otherwise it updates props recursively. I&apos;d use
                      React.memo on pure components and useCallback/useMemo for functions and values
                      passed as props...
                    </p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    <User size={12} />
                  </div>
                </div>

                {/* AI feedback card */}
                <div className="animate-fade-up rounded-lg border border-border bg-card p-4 [animation-delay:800ms] [animation-fill-mode:backwards]">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">AI Score & Feedback</span>
                    </div>
                    <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                      <span className="text-[10px] font-bold text-success">
                        Score: 7/10
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-[10px] font-mono font-semibold uppercase text-success">
                        Strengths
                      </h4>
                      <ul className="mt-1.5 space-y-1">
                        {[
                          'Correctly explained reconciliation and key-based updates',
                          'Mentioned React.memo as optimization strategy',
                        ].map((s) => (
                          <li key={s} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="mt-0.5 text-success">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-mono font-semibold uppercase text-warn">
                        Improve
                      </h4>
                      <ul className="mt-1.5 space-y-1">
                        {[
                          'Did not mention `key` prop impact on reconciliation',
                          'No concrete example of profiling with React DevTools',
                        ].map((s) => (
                          <li key={s} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="mt-0.5 text-warn">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Next button area */}
                <div className="animate-fade-up flex justify-end [animation-delay:1000ms] [animation-fill-mode:backwards]">
                  <div className="inline-flex cursor-default items-center gap-1.5 rounded-sm bg-primary/80 px-4 py-2 text-[11px] font-medium text-primary-foreground">
                    Next Question <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
