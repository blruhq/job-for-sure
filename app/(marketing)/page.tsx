import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-20 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-caption text-text-secondary mb-8 shadow-card">
          AI-powered resume builder
        </div>
        <h1 className="text-display-xl text-text-primary font-[650] tracking-[-1.4px] leading-[1.0]">
          Your resume, tailored to{' '}
          <span className="text-accent">every job</span>
        </h1>
        <p className="mt-4 text-body-lg text-text-secondary max-w-xl mx-auto">
          Upload your resume once. Paste any job link. Get an optimized version in 30 seconds. No more rewriting for every application.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-[510] text-text-primary hover:bg-hover active:scale-[0.97] transition-all duration-150 shadow-card"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="w-full max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Upload or Chat', desc: 'Upload your existing resume or build one by chatting with AI. It takes 2 minutes.' },
            { step: '02', title: 'Paste a Job Link', desc: 'Any job from Indeed, JobDB, LinkedIn. AI scrapes the requirements automatically.' },
            { step: '03', title: 'Get Tailored Resume', desc: 'AI rewrites your resume to match. Preview, tweak, download PDF. All in one place.' },
          ].map((f) => (
            <div key={f.step} className="rounded-xl border border-border bg-surface p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
              <span className="text-caption font-[600] text-accent">{f.step}</span>
              <h3 className="mt-3 text-h3 text-text-primary">{f.title}</h3>
              <p className="mt-2 text-body-compact text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-border py-8 text-center text-caption text-text-tertiary">
        <span>© 2026 Job For Sure</span>
      </footer>
    </div>
  )
}
