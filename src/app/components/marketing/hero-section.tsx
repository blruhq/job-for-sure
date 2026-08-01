'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { ArrowRight, CheckCircle2, FileText, Target, Mic, SquareKanban, Sparkles, Wand2, MessageSquare, AlertCircle, Upload, ClipboardList, GripVertical, PlusCircle, X, Brain, User, RotateCcw } from 'lucide-react'
import { Mascot } from '~/components/marketing/mascot'
import { useTranslations } from 'next-intl'
import { cn } from '~/lib/utils'

type TabType = 'chat' | 'ats' | 'resume' | 'interview' | 'tracker'

export function HeroSection() {
  const t = useTranslations('landing')
  const [activeTab, setActiveTab] = useState<TabType>('chat')

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: '💬 AI Career Coach', icon: MessageSquare },
    { id: 'ats', label: '🎯 ATS Optimizer (89%)', icon: Target },
    { id: 'resume', label: '📄 Resume Builder', icon: FileText },
    { id: 'interview', label: '🎙️ Mock Interview', icon: Mic },
    { id: 'tracker', label: '📊 Job Tracker', icon: SquareKanban },
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

      {/* ── 1140px CENTERED 16:10 ASPECT BROWSER MOCKUP FRAME ── */}
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

          {/* App Window Container — Production 16:10 Proportions */}
          <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl neuro-card border border-border/80 shadow-2xl translate-y-3 sm:translate-y-4 bg-background aspect-[16/10] min-h-[480px] md:min-h-[580px] flex flex-col w-full">
            {/* macOS Browser Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57] inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#FFBD2E] inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#27C93F] inline-block" />
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
                          ? 'bg-background text-foreground shadow-sm border border-border/60 font-semibold'
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

            {/* Tab Content Area — Real Proportional Production UI */}
            <div className="p-4 sm:p-6 bg-background flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* TAB 1: AI CAREER COACH (Matches src/app/components/chat/chat-view.tsx) */}
              {activeTab === 'chat' && (
                <div className="flex flex-col animate-fade-in h-full rounded-xl neuro-card border border-border/60 bg-background overflow-hidden">
                  {/* Status bar — matches real chat-view.tsx */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 text-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Profile:</span>
                      <span className="rounded-xs neuro-inset px-2 py-1 text-sm font-medium">Alex Morgan — Sr. FE Engineer</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Target:</span>
                      <span className="rounded-xs neuro-inset px-2 py-1 text-sm font-medium">General Career Coach</span>
                    </div>
                  </div>

                  {/* Chat stream */}
                  <div className="flex flex-col justify-between flex-1 p-4 sm:p-5 space-y-4">
                    <div className="space-y-4 text-sm flex-1 flex flex-col justify-center">
                      {/* User Message */}
                      <div className="flex items-start justify-end gap-3">
                        <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground p-3.5 shadow-sm leading-relaxed">
                          Can you help me rewrite my Senior Engineer bullet points to highlight GraphQL and Docker for my target role?
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ME
                        </div>
                      </div>

                      {/* AI Coach Response */}
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                          AI
                        </div>
                        <div className="max-w-[90%] space-y-3 rounded-2xl bg-muted/60 p-4 border border-border/40 text-foreground leading-relaxed">
                          <p>Here is an optimized bullet point tailored to your target job description:</p>
                          <div className="rounded-xl bg-background p-3 border border-border/60 font-medium text-foreground">
                            &ldquo;Architected microservices using <strong>GraphQL</strong> and containerized deployments with <strong>Docker</strong> & Redis, cutting infrastructure latency by 38%.&rdquo;
                          </div>
                          <p className="text-xs text-muted-foreground">Want me to suggest two more bullet points for GraphQL and Docker?</p>
                        </div>
                      </div>
                    </div>

                    {/* Action pills — matches real chat-view.tsx */}
                    <div className="flex items-center gap-1.5 pb-1.5">
                      <span className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-xs font-medium">
                        <Upload size={11} /> Upload Resume
                      </span>
                      <span className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-xs font-medium">
                        <FileText size={11} /> Build with AI
                      </span>
                      <span className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-xs font-medium">
                        <ClipboardList size={11} /> Paste Job
                      </span>
                    </div>
                    {/* Chat Input Bar */}
                    <div className="flex items-center gap-3 rounded-2xl neuro-input p-3 border border-border/60 bg-muted/20 shrink-0">
                      <input
                        type="text"
                        readOnly
                        value="Ask anything about your resume or job search..."
                        className="w-full bg-transparent text-sm text-foreground outline-none px-2"
                      />
                      <button className="rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shrink-0 shadow-sm flex items-center gap-1.5">
                        Send <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATS OPTIMIZER (Matches src/app/components/ats/ats-view.tsx) */}
              {activeTab === 'ats' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 animate-fade-in h-full">
                  {/* Left Column: Job Input + Radial Score + Keyword Analysis */}
                  <div className="space-y-5 rounded-2xl neuro-inset p-5 sm:p-6 border border-border/40 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-foreground">ATS Matcher</h3>
                          <p className="text-xs text-muted-foreground">Analyze your resume against real job descriptions</p>
                        </div>
                        <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md font-bold">Real-time</span>
                      </div>

                      {/* Radial Gauge Card */}
                      <div className="flex items-center gap-4 rounded-xl neuro-card p-4 border border-border/60">
                        <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                          <svg className="h-16 w-16 -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="5" />
                            <circle
                              cx="32" cy="32" r="28" fill="none"
                              stroke="var(--primary)" strokeWidth="5" strokeLinecap="round"
                              strokeDasharray="175" strokeDashoffset="20"
                            />
                          </svg>
                          <span className="absolute font-mono text-sm font-extrabold text-primary">89%</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-success uppercase tracking-wider block">Strong Match</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Your resume strongly aligns with <strong>Senior Full-Stack Engineer @ TechCorp</strong>.</p>
                        </div>
                      </div>

                      {/* Keywords Grid */}
                      <div className="space-y-3 pt-1">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1 mb-1.5">
                            <CheckCircle2 size={13} /> Matched Keywords (14)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['React 19', 'TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Node.js', 'REST APIs'].map((k) => (
                              <span key={k} className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success border border-success/20">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-warn flex items-center gap-1 mb-1.5">
                            <AlertCircle size={13} /> Missing Keywords (4)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['GraphQL', 'Docker', 'Redis', 'CI/CD Pipelines'].map((k) => (
                              <span key={k} className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-medium text-warn border border-warn/20">
                                + {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Tailor Action Button */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-primary" />
                        <span className="text-xs font-semibold text-foreground">Tailor Resume for this Job</span>
                      </div>
                      <button className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm flex items-center gap-1.5">
                        <Wand2 size={13} /> Tailor with AI
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Real-Time Resume Sheet Preview */}
                  <div className="rounded-2xl border border-border/60 bg-white p-6 text-zinc-900 shadow-md flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-zinc-200 pb-3 flex justify-between items-start">
                        <div>
                          <h4 className="text-xl font-bold text-zinc-900">Alex Morgan</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">alex.morgan@email.com · San Francisco, CA · github.com/alexmorgan</p>
                        </div>
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded font-serif uppercase tracking-widest font-semibold">Modern Sheet</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-1">Professional Summary</span>
                        <p className="text-xs text-zinc-700 leading-relaxed">
                          Senior Full-Stack Engineer with 5+ years of experience specializing in React 19, TypeScript, and high-throughput Node.js microservices. Proven track record of scaling user-facing applications to 50k+ daily active users.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-1">Work Experience</span>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900">
                            <span>Senior Full-Stack Engineer — TechCorp</span>
                            <span className="text-zinc-500 font-normal">2022 — Present</span>
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed">
                            • Optimized web app performance using React 19 server components and Tailwind CSS v4.<br />
                            • Led cross-functional team of 6 engineers to ship real-time analytics dashboard.<br />
                            • Reduced API latency by 35% across core user onboarding endpoints.
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

              {/* TAB 3: RESUME BUILDER (Matches src/app/components/resume/resume-detail.tsx) */}
              {activeTab === 'resume' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in h-full">
                  {/* Editor — left panel */}
                  <div className="flex flex-col gap-2.5 overflow-hidden">
                    {/* Section: Personal Details */}
                    <div className="relative rounded-xs neuro-inset p-3">
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <span className="label-mono block text-[10px] text-muted-foreground">Full Name</span>
                            <div className="rounded-xs border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">Alex Morgan</div>
                          </div>
                          <div>
                            <span className="label-mono block text-[10px] text-muted-foreground">Headline / Target Role</span>
                            <div className="rounded-xs border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">Senior Full-Stack Engineer</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Summary */}
                    <div className="relative rounded-xs neuro-inset p-3">
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
                        <div className="flex-1">
                          <span className="label-mono block text-[10px] text-muted-foreground mb-1">Professional Summary</span>
                          <div className="rounded-xs border border-border/60 bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed">
                            Senior Full-Stack Engineer with 5+ years specializing in React 19, TypeScript & Node.js microservices.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Skills */}
                    <div className="relative rounded-xs neuro-inset p-3">
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
                        <div className="flex-1">
                          <span className="label-mono block text-[10px] text-muted-foreground mb-1.5">Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {['React 19', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'PostgreSQL', 'Tailwind CSS'].map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-0.5 rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {tag}
                                <X size={8} className="text-primary/50" />
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Work Experience */}
                    <div className="relative rounded-xs neuro-inset p-3">
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="label-mono text-[10px] text-muted-foreground">Work Experience</span>
                          </div>
                          <div className="rounded-xs border border-border/60 bg-background p-2.5 space-y-1.5">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <span className="label-mono block text-[9px] text-muted-foreground/70">Company</span>
                                <span className="text-xs font-semibold text-foreground">TechCorp</span>
                              </div>
                              <div className="flex-1">
                                <span className="label-mono block text-[9px] text-muted-foreground/70">Role</span>
                                <span className="text-xs font-semibold text-foreground">Sr. Full-Stack Engineer</span>
                              </div>
                            </div>
                            <div>
                              <span className="label-mono block text-[9px] text-muted-foreground/70">Highlights</span>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                • Optimized web app performance with React 19 server components<br />
                                • Led cross-functional team of 6 engineers on analytics dashboard<br />
                                • Reduced API latency by 35% across onboarding endpoints
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* + Add Section button */}
                    <div className="flex items-center justify-center gap-1 rounded-xs border border-dashed border-border py-2 text-xs text-muted-foreground">
                      <PlusCircle size={13} /> Add Section
                    </div>
                  </div>

                  {/* PDF Live Preview — right panel */}
                  <div className="rounded-xl border border-border/60 bg-white p-5 text-zinc-900 shadow-md flex flex-col overflow-hidden">
                    <div className="space-y-3 flex-1">
                      {/* Header */}
                      <div className="border-b border-zinc-200 pb-2.5 flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-bold text-zinc-900">Alex Morgan</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">alex.morgan@email.com · San Francisco, CA · github.com/alexmorgan</p>
                          <p className="text-[10px] text-zinc-600 font-medium mt-0.5">Senior Full-Stack Engineer</p>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-0.5">Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {['React 19', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'PostgreSQL'].map((k) => (
                            <span key={k} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium text-zinc-700">{k}</span>
                          ))}
                        </div>
                      </div>

                      {/* Work Experience */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-800 border-b border-zinc-200 block pb-0.5">Work Experience</span>
                        <div>
                          <div className="flex justify-between text-xs font-bold text-zinc-900">
                            <span>Sr. Full-Stack Engineer — TechCorp</span>
                            <span className="text-zinc-500 font-normal">2022 — Present</span>
                          </div>
                          <p className="text-[10px] text-zinc-600 leading-relaxed mt-1">
                            • Optimized web app performance with React 19 server components<br />
                            • Led cross-functional team of 6 engineers on analytics dashboard<br />
                            • Reduced API latency by 35% across onboarding endpoints
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[9px] text-zinc-400">
                      <span>Modern Template</span>
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MOCK INTERVIEW (Matches src/app/components/interview/interview-session.tsx) */}
              {activeTab === 'interview' && (
                <div className="animate-fade-in flex flex-col h-full overflow-hidden">
                  {/* Header bar — matches real component */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-primary/10 p-1 text-primary">
                        <Brain size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">Mock Interview: Stripe</div>
                        <div className="text-[9px] text-muted-foreground">Staff Frontend Dev · medium · behavioral</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-muted-foreground">Question 2 of 5</div>
                    </div>
                  </div>

                  {/* Chat stream area */}
                  <div className="flex-1 overflow-hidden px-4 py-4">
                    <div className="mx-auto max-w-[560px] space-y-4">

                      {/* Question 1 (collapsed history) */}
                      <div className="space-y-3 border-b border-border/40 pb-3">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Question 1</div>
                        {/* Question card */}
                        <div className="rounded-lg neuro-card p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary">
                              <Brain size={10} />
                            </div>
                            <span className="text-[9px] font-mono uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">technical</span>
                          </div>
                          <p className="text-xs text-foreground font-medium leading-relaxed">Walk me through how you'd implement a virtual scrolling list for 10k items.</p>
                        </div>
                        {/* Answer (right-aligned) */}
                        <div className="flex items-start gap-2 justify-end pl-8">
                          <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-[11px] text-foreground max-w-full">
                            <p className="leading-relaxed">I'd use windowing — only render visible rows plus a buffer. Track scroll position, compute visible range...</p>
                          </div>
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <User size={10} />
                          </div>
                        </div>
                        {/* Feedback (collapsed) */}
                        <div className="rounded-lg neuro-card p-3 ml-4 mr-4">
                          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-primary" />
                              <span className="text-[11px] font-semibold text-foreground">AI Score & Feedback</span>
                            </div>
                            <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                              <span className="text-[9px] font-bold text-success">Score: 8/10</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[9px] font-mono uppercase text-success font-semibold mb-1">Strengths</h4>
                            <ul className="space-y-0.5">
                              <li className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-success">•</span> Clear understanding of windowing concept
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Active Question 2 */}
                      <div className="space-y-3">
                        <div className="text-[9px] font-semibold text-primary uppercase tracking-wider">Active Question</div>
                        {/* Question card */}
                        <div className="rounded-lg neuro-card p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary">
                              <Brain size={10} />
                            </div>
                            <span className="text-[9px] font-mono uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">behavioral</span>
                            <span className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">#crisis</span>
                          </div>
                          <p className="text-xs text-foreground font-semibold leading-relaxed">
                            Describe a situation where a critical production bug occurred right before a launch. How did you handle it?
                          </p>
                        </div>

                        {/* Answer (submitted) */}
                        <div className="flex items-start gap-2 justify-end pl-8">
                          <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-[11px] text-foreground max-w-full">
                            <p className="leading-relaxed">I stayed calm, isolated the issue to a Redis connection timeout, rolled back the release, and communicated transparently with stakeholders about the timeline...</p>
                          </div>
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <User size={10} />
                          </div>
                        </div>

                        {/* Feedback card */}
                        <div className="rounded-lg neuro-card p-3 ml-4 mr-4">
                          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-primary" />
                              <span className="text-[11px] font-semibold text-foreground">AI Score & Feedback</span>
                            </div>
                            <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                              <span className="text-[9px] font-bold text-success">Score: 9/10</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <h4 className="text-[9px] font-mono uppercase text-success font-semibold mb-1">Strengths</h4>
                              <ul className="space-y-0.5">
                                <li className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-success">•</span> Clear structured response with STAR method
                                </li>
                                <li className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-success">•</span> Specific resolution metrics (rollback time)
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-[9px] font-mono uppercase text-warn font-semibold mb-1">Areas to Improve</h4>
                              <ul className="space-y-0.5">
                                <li className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-warn">•</span> Mention post-mortem action items
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-[9px] font-mono uppercase text-primary font-semibold mb-1">Suggested Model Answer</h4>
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/30 p-2 rounded-sm border border-border/50">
                                &ldquo;During a launch, our monitoring flagged Redis timeouts...&rdquo;
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-1">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                            <RotateCcw size={10} /> Try Again
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground">
                            Next Question <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: JOB TRACKER (Matches src/app/[locale]/(app)/applications/page.tsx) */}
              {activeTab === 'tracker' && (
                <div className="space-y-4 animate-fade-in flex flex-col justify-between h-full">
                  {/* Board header */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <SquareKanban size={16} className="text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider text-foreground">Application Board</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">4 Active</span>
                  </div>

                  {/* Kanban Columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                    {/* Bookmarked */}
                    <div className="rounded-xl neuro-inset p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Bookmarked</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3 space-y-1 border border-border/60">
                        <span className="text-[10px] font-semibold text-primary">Stripe</span>
                        <h5 className="text-xs font-bold text-foreground">Staff Frontend Dev</h5>
                        <span className="text-[10px] text-muted-foreground block">San Francisco · Remote</span>
                      </div>
                    </div>

                    {/* Applied */}
                    <div className="rounded-xl neuro-inset p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-warn">
                        <span>Applied</span>
                        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px]">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3 space-y-1 border border-warn/30">
                        <span className="text-[10px] font-semibold text-warn">Vercel</span>
                        <h5 className="text-xs font-bold text-foreground">React Engineer</h5>
                        <span className="text-[10px] text-muted-foreground block">Applied 2d ago</span>
                      </div>
                    </div>

                    {/* Interviewing */}
                    <div className="rounded-xl neuro-inset p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span>Interviewing</span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px]">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3 space-y-1 border border-primary/40 bg-primary/5">
                        <span className="text-[10px] font-semibold text-primary">OpenAI</span>
                        <h5 className="text-xs font-bold text-foreground">Product Engineer</h5>
                        <span className="text-[10px] text-primary font-semibold block">Round 2 · Tomorrow</span>
                      </div>
                    </div>

                    {/* Offer */}
                    <div className="rounded-xl neuro-inset p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-success">
                        <span>Offer</span>
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px]">1</span>
                      </div>
                      <div className="rounded-xl neuro-card p-3 space-y-1 border border-success/40 bg-success/5">
                        <span className="text-[10px] font-semibold text-success">Linear</span>
                        <h5 className="text-xs font-bold text-foreground">Senior UI Engineer</h5>
                        <span className="text-[10px] text-success font-bold block">$185k Offer</span>
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
