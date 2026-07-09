import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MessageSquare, KanbanSquare, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: { absolute: 'Job For Sure' },
  description: 'Upload your resume once. Get AI-matched jobs, ATS-optimized resumes, and a full application pipeline.',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── HERO ── */}
      <section className="relative flex flex-1 flex-col justify-center px-6 py-24 md:py-32">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, var(--primary), transparent 50%)',
          }}
        />
        <div className="relative mx-auto w-full max-w-[1120px]">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
              Know your chances
              <br />
              before you apply.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Upload your resume. Get instant match scores against real jobs,
              ATS-tailored applications, and track every step — from saved to offer.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/register"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Get Started Free <ArrowRight size={14} />
              </Link>
              <Link
                href="/login"
                className="inline-flex cursor-pointer items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:py-28">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Three tools. One workflow.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From the first upload to the final offer — no spreadsheets, no guesswork.
            </p>
          </div>

          <div className="mt-16 divide-y divide-border border-t border-border">
            {[
              {
                icon: MessageSquare,
                title: 'AI Chat Coach',
                desc: 'Talk to an AI that knows your resume inside out. Get interview prep, salary guidance, and instant keyword analysis — in real time, not after three business days.',
                color: 'text-primary',
              },
              {
                icon: KanbanSquare,
                title: 'Pipeline Tracker',
                desc: 'Bookmark jobs, drag them through stages, and never lose track. See your entire search at a glance — saved, applied, interviewing, offer.',
                color: 'text-success',
              },
              {
                icon: ShieldCheck,
                title: 'ATS Optimizer',
                desc: 'Paste a job description. Get an instant match score with missing keywords highlighted. Inject them with one click, not thirty minutes of manual editing.',
                color: 'text-[var(--warn)]',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="grid grid-cols-1 gap-4 py-10 md:grid-cols-[200px_1fr] md:gap-16">
                <div className="flex items-center gap-3">
                  <Icon size={20} className={`shrink-0 ${color}`} />
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                </div>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMITTED COLOR CTA ── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground md:text-4xl">
              Your next role is closer
              <br />
              than you think.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-primary-foreground/80">
              Upload your resume and get matched in 30 seconds.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary-foreground px-6 py-3 text-sm font-medium text-primary transition-all hover:bg-primary-foreground/90 active:scale-[0.98]"
            >
              Get Started Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-primary-foreground/10 px-6 py-8">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between">
          <span className="text-sm text-primary-foreground/60">© 2026 Job For Sure</span>
          <div className="flex gap-6 text-sm text-primary-foreground/60">
            <Link href="/login" className="cursor-pointer transition-colors hover:text-primary-foreground">Sign In</Link>
            <Link href="/register" className="cursor-pointer transition-colors hover:text-primary-foreground">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
