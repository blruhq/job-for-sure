import { Upload, Search, FileCheck, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    icon: Upload,
    title: 'Upload Resume',
    desc: 'Drop your PDF or paste your experience. AI parses it into a structured profile in seconds.',
  },
  {
    icon: Search,
    title: 'Match with Jobs',
    desc: 'Get an ATS match score against real job descriptions. See exactly where you stand.',
  },
  {
    icon: FileCheck,
    title: 'Tailor & Apply',
    desc: 'Chat with AI to rewrite bullet points, inject missing keywords, and generate tailored applications.',
  },
  {
    icon: LayoutDashboard,
    title: 'Track Applications',
    desc: 'Drag jobs through stages — saved, applied, interviewing, offer. Never lose track.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            From upload to offer in four steps.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No fluff. No spreadsheets. Just a clear path from resume to offer.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-4 top-6 hidden h-px w-8 border-t border-dashed border-border md:block" />
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <Icon size={20} />
                </div>
                <div className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-12">
          <Link
            href="/register"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Start now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
