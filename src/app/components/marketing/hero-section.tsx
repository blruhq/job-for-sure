'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { ArrowRight, CheckCircle2, Sparkles, FileText, Target, Mic, SquareKanban } from 'lucide-react'
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
    <section className="relative flex flex-col items-center overflow-x-clip px-4 sm:px-6 pt-[10vh] md:pt-[12vh] pb-0">
      <div className="pointer-events-none absolute inset-0 hero-glow opacity-[0.05]" />

      {/* ── CENTERED TYPOGRAPHY & BADGE ── */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Top Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Sparkles size={13} className="text-primary" />
          <span>{t('heroBadge')}</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {t('subtitle')}
        </p>

        {/* CTAs */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            href="/chat"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
          >
            {t('startChat')} <ArrowRight size={16} />
          </Link>
          <Link
            href="/register"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl neuro-pill px-7 py-3.5 text-base font-semibold text-foreground transition-all active:scale-[0.98] sm:w-auto"
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

      {/* ── 1200px PEEKING BROWSER MOCKUP FRAME ── */}
      <div className="relative mt-12 md:mt-16 w-full max-w-[1200px] z-10">
        {/* Jobby Mascot Peeking over top-right corner */}
        <Mascot
          src="/mascot/jobby-hero.webp"
          alt={t('mascotAltHero')}
          size="sm"
          priority
          variant="breathe"
          className="absolute -top-14 -right-2 sm:-top-20 sm:right-6 md:-top-24 md:right-10 z-20 drop-shadow-2xl pointer-events-none"
        />

        {/* App Window Container — Peeking cutout bottom fold */}
        <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl neuro-card border border-border/80 shadow-2xl translate-y-3 sm:translate-y-4">
          {/* macOS Browser Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57] inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#FFBD2E] inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#27C93F] inline-block" />
              </div>
              <span className="text-xs font-mono text-muted-foreground/80 bg-background/50 px-3 py-1 rounded-md border border-border/40">
                jobforsure.app/workspace
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
                      'flex items-center gap-2 shrink-0 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer',
                      isActive
                        ? 'bg-background text-foreground shadow-sm border border-border/60'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                    )}
                  >
                    <Icon size={15} className={isActive ? 'text-primary' : ''} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="p-4 sm:p-6 md:p-8 bg-background/50 min-h-[340px] sm:min-h-[420px] flex flex-col justify-between">
            {activeTab === 'ats' && (
              <div className="space-y-6 animate-fade-in">
                {/* ATS Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('mockupAtsScore')}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      Senior Full-Stack Engineer @ TechCorp
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold text-primary tabular-nums">
                      89<span className="text-sm font-normal text-muted-foreground">%</span>
                    </span>
                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success border border-success/20">
                      Strong Match
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>ATS Compatibility Bar</span>
                    <span>89 / 100</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[89%] rounded-full bg-primary transition-all duration-500" />
                  </div>
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl neuro-inset p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Matched Skills (14)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['React 19', 'TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Node.js', 'REST APIs', 'Git'].map((skill) => (
                        <span key={skill} className="rounded-md bg-success/10 px-2.5 py-1 text-xs font-medium text-success border border-success/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl neuro-inset p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-warn flex items-center gap-1.5">
                      <Sparkles size={14} /> Missing Keywords (4)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['GraphQL', 'Docker', 'Redis', 'CI/CD Pipelines'].map((skill) => (
                        <span key={skill} className="rounded-md bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn border border-warn/20">
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Coach Box */}
                <div className="rounded-xl neuro-card border border-primary/20 p-4 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      AI
                    </div>
                    <span className="text-xs font-bold text-foreground">{t('mockupCareerCoach')}</span>
                    <span className="text-[10px] text-muted-foreground">{t('mockupJustNow')}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Adding <strong className="text-foreground">GraphQL</strong> and <strong className="text-foreground">Docker</strong> to your experience bullets will boost your ATS score to <strong>96%</strong>. Click below to inject keywords.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'resume' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* Editor Inputs */}
                <div className="space-y-4 rounded-xl neuro-inset p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Interactive Editor</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">Live Sync</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-muted-foreground font-medium block mb-1">Full Name</label>
                      <div className="rounded-lg neuro-input px-3 py-2 text-foreground font-medium">Alex Morgan</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground font-medium block mb-1">Target Job Title</label>
                      <div className="rounded-lg neuro-input px-3 py-2 text-foreground font-medium">Senior Frontend Engineer</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground font-medium block mb-1">AI Tailored Bullet Point</label>
                      <div className="rounded-lg neuro-input px-3 py-2 text-foreground leading-relaxed">
                        Architected high-throughput React dashboard serving 50k+ daily users, improving page load speeds by 42%.
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Live Preview */}
                <div className="rounded-xl border border-border/60 bg-white p-5 text-zinc-900 shadow-md min-h-[260px] flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="border-b border-zinc-200 pb-3 flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-zinc-900">Alex Morgan</h4>
                        <p className="text-xs text-zinc-500">alex.morgan@email.com · San Francisco, CA</p>
                      </div>
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-serif uppercase tracking-widest">Modern Template</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-0.5">Work Experience</span>
                      <div className="text-xs">
                        <div className="flex justify-between font-semibold text-zinc-800">
                          <span>Senior Frontend Engineer</span>
                          <span className="text-zinc-500 font-normal">2022 — Present</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-1 leading-normal">
                          • Optimized web app performance using React 19 server components and Tailwind CSS v4.<br />
                          • Led cross-functional team of 6 engineers to ship real-time analytics dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Generated by Job For Sure AI</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interview' && (
              <div className="space-y-5 animate-fade-in">
                {/* Session Bar */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">AI Mock Interview Session</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">Question 2 of 5</span>
                </div>

                {/* AI Question */}
                <div className="rounded-xl neuro-card p-4 sm:p-5 border border-primary/20 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Behavioral Question</span>
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                    &ldquo;Describe a situation where a critical production bug occurred right before a launch. How did you handle it?&rdquo;
                  </p>
                </div>

                {/* Candidate Answer + AI Evaluation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-xl neuro-inset p-4 space-y-2">
                    <span className="text-xs font-bold text-muted-foreground">Your Recorded Answer (STAR Method)</span>
                    <p className="text-xs text-foreground leading-relaxed italic">
                      &ldquo;I stayed calm, isolated the issue to a Redis connection timeout, rolled back the release, and communicated transparently with stakeholders...&rdquo;
                    </p>
                  </div>

                  <div className="rounded-xl neuro-card p-4 space-y-2 bg-success/5 border border-success/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-success">AI Rating</span>
                        <span className="font-mono text-xl font-bold text-success">9/10</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Excellent use of STAR method with clear metrics and resolution steps.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-1 rounded text-center block">
                      STAR Verified
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tracker' && (
              <div className="space-y-4 animate-fade-in">
                {/* Kanban Headers */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Application Board</span>
                  <span className="text-xs text-muted-foreground">4 Active Applications</span>
                </div>

                {/* Kanban Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Bookmarked */}
                  <div className="rounded-xl neuro-inset p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>Bookmarked</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">1</span>
                    </div>
                    <div className="rounded-lg neuro-card p-3 space-y-1.5 border border-border/60">
                      <span className="text-[10px] font-semibold text-primary">Stripe</span>
                      <h5 className="text-xs font-bold text-foreground">Staff Frontend Dev</h5>
                      <span className="text-[10px] text-muted-foreground block">San Francisco · Remote</span>
                    </div>
                  </div>

                  {/* Applied */}
                  <div className="rounded-xl neuro-inset p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-warn">
                      <span>Applied</span>
                      <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px]">1</span>
                    </div>
                    <div className="rounded-lg neuro-card p-3 space-y-1.5 border border-warn/30">
                      <span className="text-[10px] font-semibold text-warn">Vercel</span>
                      <h5 className="text-xs font-bold text-foreground">React Engineer</h5>
                      <span className="text-[10px] text-muted-foreground block">Applied 2d ago</span>
                    </div>
                  </div>

                  {/* Interviewing */}
                  <div className="rounded-xl neuro-inset p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                      <span>Interviewing</span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px]">1</span>
                    </div>
                    <div className="rounded-lg neuro-card p-3 space-y-1.5 border border-primary/40 bg-primary/5">
                      <span className="text-[10px] font-semibold text-primary">OpenAI</span>
                      <h5 className="text-xs font-bold text-foreground">Product Engineer</h5>
                      <span className="text-[10px] text-primary font-medium block">Round 2 · Tomorrow</span>
                    </div>
                  </div>

                  {/* Offer */}
                  <div className="rounded-xl neuro-inset p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-success">
                      <span>Offer</span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px]">1</span>
                    </div>
                    <div className="rounded-lg neuro-card p-3 space-y-1.5 border border-success/40 bg-success/5">
                      <span className="text-[10px] font-semibold text-success">Linear</span>
                      <h5 className="text-xs font-bold text-foreground">Senior UI Engineer</h5>
                      <span className="text-[10px] text-success font-bold block">🎉 $185k Offer</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
