'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { ArrowRight, CheckCircle2, FileText, Target, Mic, SquareKanban, Sparkles } from 'lucide-react'
import { Mascot } from '~/components/marketing/mascot'
import { useTranslations } from 'next-intl'
import { cn } from '~/lib/utils'

type TabType = 'ats' | 'resume' | 'interview' | 'tracker'

export function HeroSection() {
  const t = useTranslations('landing')
  const [activeTab, setActiveTab] = useState<TabType>('ats')

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'ats', label: t('tabAtsMatch'), icon: Target },
    { id: 'resume', label: t('tabResumeBuilder'), icon: FileText },
    { id: 'interview', label: t('tabInterviewPrep'), icon: Mic },
    { id: 'tracker', label: t('tabJobTracker'), icon: SquareKanban },
  ]

  return (
    <section className="relative flex flex-col items-center overflow-x-clip px-4 sm:px-6 pt-[8vh] md:pt-[10vh] pb-0 w-full">
      <div className="pointer-events-none absolute inset-0 hero-glow opacity-[0.04]" />

      {/* ── CENTERED TYPOGRAPHY ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        {/* Headline */}
        <h1 className="text-4xl font-bold leading-[1.08] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>

        {/* CTAs */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-3">
          <Link
            href="/chat"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
          >
            {t('startChat')} <ArrowRight size={15} />
          </Link>
          <Link
            href="/register"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg neuro-pill px-6 py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.98] sm:w-auto"
          >
            {t('createAccount')}
          </Link>
        </div>

        {/* Micro Trust Text */}
        <p className="mt-4 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-success" />
          {t('heroTrustText')}
        </p>
      </div>

      {/* ── 1140px CENTERED 16:10 BROWSER MOCKUP FRAME ── */}
      <div className="w-full flex justify-center mt-12 md:mt-16 z-10">
        <div className="relative w-full max-w-[1140px] mx-auto">
          {/* Jobby Mascot Peeking behind top-left corner */}
          <Mascot
            src="/mascot/jobby-hero.webp"
            alt={t('mascotAltHero')}
            size="sm"
            priority
            variant="breathe"
            className="absolute -top-24 left-2 sm:-top-32 sm:left-6 md:-top-36 md:left-10 z-0 opacity-90 drop-shadow-xl pointer-events-none"
          />

          {/* App Window Container — Natural 16:10 Proportions */}
          <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl neuro-card border border-border/80 shadow-2xl translate-y-3 sm:translate-y-4 bg-background aspect-[16/10] min-h-[420px] max-h-[580px] flex flex-col w-full">
            {/* macOS Browser Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 gap-3 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57] inline-block" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E] inline-block" />
                  <span className="h-3 w-3 rounded-full bg-[#27C93F] inline-block" />
                </div>
                <span className="text-xs font-mono text-muted-foreground/80 bg-background/50 px-3 py-1 rounded-md border border-border/40">
                  jobforsure.app/{activeTab === 'ats' ? 'chat' : activeTab === 'resume' ? 'resumes' : activeTab === 'interview' ? 'interview' : 'applications'}
                </span>
              </div>

              {/* Interactive Tabs Bar */}
              <div className="flex w-full sm:w-auto items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 shrink-0 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer',
                        isActive
                          ? 'bg-background text-foreground shadow-sm border border-border/60'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                      )}
                    >
                      <Icon size={15} className={isActive ? 'text-primary' : ''} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content Area — Real Proportional UI */}
            <div className="p-5 sm:p-7 bg-background flex-1 flex flex-col justify-between overflow-hidden">
              {activeTab === 'ats' && (
                <div className="flex flex-col h-full justify-between space-y-4 animate-fade-in">
                  {/* Real App Status Bar */}
                  <div className="neuro-surface flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/40 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Profile:</span>
                      <span className="font-semibold text-foreground">Alex_Morgan_Resume.pdf (89%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Target:</span>
                      <span className="font-semibold text-primary">Senior Full-Stack Engineer @ TechCorp</span>
                    </div>
                  </div>

                  {/* Real Entry Cards Flow */}
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <div className="text-center font-bold text-xl text-foreground mb-5">
                      How do you want to start?
                    </div>
                    <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                      {/* Upload */}
                      <div className="neuro-card flex flex-col items-center rounded-2xl p-5 text-center border border-border/60">
                        <div className="neuro-icon-well mb-3 flex h-11 w-11 items-center justify-center rounded-full text-primary">
                          <FileText size={20} />
                        </div>
                        <div className="text-sm font-bold text-foreground">Upload Resume</div>
                        <div className="mt-1 text-xs text-muted-foreground">PDF, DOCX, or text</div>
                      </div>

                      {/* Build with AI */}
                      <div className="neuro-card flex flex-col items-center rounded-2xl p-5 text-center border border-primary/30 bg-primary/5">
                        <div className="neuro-icon-well mb-3 flex h-11 w-11 items-center justify-center rounded-full text-success">
                          <Sparkles size={20} />
                        </div>
                        <div className="text-sm font-bold text-foreground">Build with AI</div>
                        <div className="mt-1 text-xs text-muted-foreground">Answer questions · 5 min</div>
                      </div>

                      {/* Paste Job Posting */}
                      <div className="neuro-card flex flex-col items-center rounded-2xl p-5 text-center border border-border/60">
                        <div className="neuro-icon-well mb-3 flex h-11 w-11 items-center justify-center rounded-full text-warn">
                          <Target size={20} />
                        </div>
                        <div className="text-sm font-bold text-foreground">Paste Job Posting</div>
                        <div className="mt-1 text-xs text-muted-foreground">Analyze ATS Match</div>
                      </div>
                    </div>
                  </div>

                  {/* Real Input Bar */}
                  <div className="flex items-center gap-3 rounded-2xl neuro-input p-3 border border-border/60 bg-muted/20">
                    <input
                      type="text"
                      readOnly
                      value="Ask Career Coach: How can I optimize my bullet points for TechCorp?"
                      className="w-full bg-transparent text-sm text-foreground outline-none px-2"
                    />
                    <button className="rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shrink-0 shadow-sm flex items-center gap-1.5">
                      Send <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in h-full">
                  {/* Editor Inputs */}
                  <div className="space-y-4 rounded-xl neuro-inset p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <span className="text-sm font-bold uppercase tracking-wider text-foreground">Interactive Editor</span>
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-mono font-semibold">Live Sync</span>
                    </div>
                    <div className="space-y-3.5 text-sm">
                      <div>
                        <label className="text-muted-foreground font-medium block mb-1">Full Name</label>
                        <div className="rounded-lg neuro-input px-3.5 py-2.5 text-foreground font-semibold">Alex Morgan</div>
                      </div>
                      <div>
                        <label className="text-muted-foreground font-medium block mb-1">Target Job Title</label>
                        <div className="rounded-lg neuro-input px-3.5 py-2.5 text-foreground font-semibold">Senior Frontend Engineer</div>
                      </div>
                      <div>
                        <label className="text-muted-foreground font-medium block mb-1">AI Tailored Bullet Point</label>
                        <div className="rounded-lg neuro-input px-3.5 py-2.5 text-foreground leading-relaxed">
                          Architected high-throughput React dashboard serving 50k+ daily users, cut page load times by 42%.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDF Live Preview */}
                  <div className="rounded-xl border border-border/60 bg-white p-6 text-zinc-900 shadow-md flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-zinc-200 pb-3 flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-bold text-zinc-900">Alex Morgan</h4>
                          <p className="text-xs text-zinc-500">alex.morgan@email.com · San Francisco, CA</p>
                        </div>
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded font-serif uppercase tracking-widest font-semibold">Modern Template</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-1">Work Experience</span>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900">
                            <span>Senior Frontend Engineer</span>
                            <span className="text-zinc-500 font-normal">2022 — Present</span>
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed">
                            • Optimized web app performance using React 19 server components and Tailwind CSS v4.<br />
                            • Led cross-functional team of 6 engineers to ship real-time analytics dashboard.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                      <span>Generated by Job For Sure AI</span>
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-5 animate-fade-in flex flex-col justify-between h-full">
                  {/* Session Bar */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-bold uppercase tracking-wider text-foreground">AI Mock Interview Session</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono font-semibold">Question 2 of 5</span>
                  </div>

                  {/* AI Question */}
                  <div className="rounded-xl neuro-card p-5 border border-primary/20 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Behavioral Question</span>
                    <p className="text-base font-semibold text-foreground leading-relaxed">
                      &ldquo;Describe a situation where a critical production bug occurred right before a launch. How did you handle it?&rdquo;
                    </p>
                  </div>

                  {/* Candidate Answer + AI Evaluation */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 rounded-xl neuro-inset p-4 space-y-2">
                      <span className="text-xs font-bold text-muted-foreground">Your Recorded Answer (STAR Method)</span>
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed italic">
                        &ldquo;I stayed calm, isolated the issue to a Redis connection timeout, rolled back the release, and communicated transparently with stakeholders...&rdquo;
                      </p>
                    </div>

                    <div className="rounded-xl neuro-card p-4 space-y-2 bg-success/5 border border-success/20 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-success">AI Rating</span>
                          <span className="font-mono text-2xl font-extrabold text-success">9/10</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Excellent use of STAR method with clear metrics.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-md text-center block">
                        STAR Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tracker' && (
                <div className="space-y-4 animate-fade-in flex flex-col justify-between h-full">
                  {/* Kanban Headers */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="text-sm font-bold uppercase tracking-wider text-foreground">Application Board</span>
                    <span className="text-xs text-muted-foreground font-semibold">4 Active Applications</span>
                  </div>

                  {/* Kanban Columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                    {/* Bookmarked */}
                    <div className="rounded-xl neuro-inset p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Bookmarked</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3.5 space-y-1.5 border border-border/60">
                        <span className="text-xs font-semibold text-primary">Stripe</span>
                        <h5 className="text-sm font-bold text-foreground">Staff Frontend Dev</h5>
                        <span className="text-xs text-muted-foreground block">San Francisco · Remote</span>
                      </div>
                    </div>

                    {/* Applied */}
                    <div className="rounded-xl neuro-inset p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-warn">
                        <span>Applied</span>
                        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3.5 space-y-1.5 border border-warn/30">
                        <span className="text-xs font-semibold text-warn">Vercel</span>
                        <h5 className="text-sm font-bold text-foreground">React Engineer</h5>
                        <span className="text-xs text-muted-foreground block">Applied 2d ago</span>
                      </div>
                    </div>

                    {/* Interviewing */}
                    <div className="rounded-xl neuro-inset p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span>Interviewing</span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3.5 space-y-1.5 border border-primary/40 bg-primary/5">
                        <span className="text-xs font-semibold text-primary">OpenAI</span>
                        <h5 className="text-sm font-bold text-foreground">Product Engineer</h5>
                        <span className="text-xs text-primary font-semibold block">Round 2 · Tomorrow</span>
                      </div>
                    </div>

                    {/* Offer */}
                    <div className="rounded-xl neuro-inset p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-success">
                        <span>Offer</span>
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3.5 space-y-1.5 border border-success/40 bg-success/5">
                        <span className="text-xs font-semibold text-success">Linear</span>
                        <h5 className="text-sm font-bold text-foreground">Senior UI Engineer</h5>
                        <span className="text-xs text-success font-bold block">🎉 $185k Offer</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
