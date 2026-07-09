import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, KanbanSquare, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: { absolute: 'Job For Sure — AI Career Coach' },
  description: 'Upload your resume once. Get AI-matched jobs, ATS-optimized resumes, and a full application pipeline. Free to start.',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── HERO ── */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        {/* Subtle gradient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, var(--primary), transparent 60%)',
          }}
        />

        <div className="relative flex flex-col items-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-primary" />
            AI-powered career coach
          </div>

          {/* Headline */}
          <h1
            className="max-w-3xl text-balance text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl"
            style={{ fontFamily: 'var(--font-instrument-serif), serif', fontWeight: 400 }}
          >
            Your AI career coach
            <br />
            that <span className="italic text-primary">never sleeps</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Upload your resume. Chat with AI to match against top companies,
            optimize for ATS, and track every application — all in one place.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Get Started Free <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="inline-flex cursor-pointer items-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-4 font-mono text-[11px] text-muted-foreground/60">
            No credit card required · Free forever
          </p>
        </div>
      </section>

      {/* ── FEATURE SHOWCASE ── */}
      <section id="features" className="border-t border-border px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2
              className="text-3xl tracking-tight text-foreground md:text-4xl"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Everything you need to land the job
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              From first upload to final offer — one tool, zero spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* AI Chat */}
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary">
                <MessageSquare size={18} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-foreground">AI Chat Coach</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Talk to an AI that knows your resume. Get interview prep, salary
                advice, and keyword analysis in real time.
              </p>
            </div>

            {/* Pipeline */}
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success">
                <KanbanSquare size={18} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-foreground">Pipeline Tracker</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Bookmark jobs, drag through stages, and never lose track. From
                saved to offer — visualize your search.
              </p>
            </div>

            {/* ATS */}
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-warn-soft text-[var(--warn)]">
                <ShieldCheck size={18} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-foreground">ATS Optimizer</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paste a job description. Get an instant match score with missing
                keywords highlighted. Auto-inject in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-t border-border bg-card px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2
              className="text-3xl tracking-tight text-foreground md:text-4xl"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Start in 30 seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '01', title: 'Upload Resume', desc: 'Drop your PDF or build one from scratch by chatting with AI.' },
              { step: '02', title: 'AI Matches Jobs', desc: 'Get scored against top companies. See exactly what skills you\'re missing.' },
              { step: '03', title: 'Apply & Track', desc: 'Optimize for each job with ATS. Bookmark to pipeline. Track to offer.' },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col">
                <span className="mb-3 font-mono text-xs font-semibold text-primary">{item.step}</span>
                <h3 className="mb-1.5 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                {i < 2 && (
                  <div className="mt-4 hidden text-muted-foreground/30 sm:block">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP PREVIEW ── */}
      <section className="border-t border-border px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h2
              className="text-3xl tracking-tight text-foreground md:text-4xl"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              See it in action
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Real AI streaming. Real match scores. No fluff.
            </p>
          </div>

          {/* Mock chat preview */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
              </div>
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">jobforsure.app/chat</span>
            </div>

            {/* Chat content */}
            <div className="space-y-3 p-5">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-md bg-accent-soft px-3.5 py-2 text-xs text-foreground">
                  I uploaded my resume. What companies match?
                </div>
              </div>
              {/* AI message */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">AI</div>
                <div className="max-w-[80%] space-y-1.5">
                  <div className="rounded-md border border-border bg-background px-3.5 py-2 text-xs leading-relaxed">
                    Here are your <strong>top matches</strong> based on your React, TypeScript, and AWS skills:
                  </div>
                  {/* Match cards */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-xs border border-border bg-background px-2 py-1 font-mono text-[10px]">
                      <strong className="text-success">92%</strong> Vercel — Sr. Frontend Eng
                    </span>
                    <span className="rounded-xs border border-border bg-background px-2 py-1 font-mono text-[10px]">
                      <strong className="text-success">85%</strong> Stripe — Software Eng
                    </span>
                    <span className="rounded-xs border border-border bg-background px-2 py-1 font-mono text-[10px]">
                      <strong className="text-[var(--warn)]">65%</strong> Cloudflare — Systems Eng
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="border-t border-border px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl tracking-tight text-foreground md:text-4xl"
            style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
          >
            Ready to find your next role?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload your resume and get matched in 30 seconds.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Get Started Free <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground/60">© 2026 Job For Sure</span>
          <div className="flex gap-4 font-mono text-[11px] text-muted-foreground/60">
            <Link href="/login" className="cursor-pointer hover:text-foreground">Sign In</Link>
            <Link href="/register" className="cursor-pointer hover:text-foreground">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
