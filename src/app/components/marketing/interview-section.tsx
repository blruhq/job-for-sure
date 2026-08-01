import { Brain, Sparkles, Target, CheckCircle, ArrowRight, User } from 'lucide-react'
import { Link } from '~/i18n/routing'
import { useTranslations } from 'next-intl'
import { Mascot } from '~/components/marketing/mascot'

export function InterviewSection() {
  const t = useTranslations('landing')

  const BULLETS = [
    { icon: Target, text: t('interviewBullet1') },
    { icon: Sparkles, text: t('interviewBullet2') },
    { icon: CheckCircle, text: t('interviewBullet3') },
    { icon: Brain, text: t('interviewBullet4') },
  ]

  const strengths = [t('interviewStrength1'), t('interviewStrength2')]
  const improvements = [t('interviewImprove1'), t('interviewImprove2')]

  return (
    <section id="interview" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] overflow-x-clip border-x border-zinc-300 px-6">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
          {/* ── Left: Copy ── */}
          <div className="relative z-10 max-w-lg">
            <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t('sectionLabelInterview')}
            </span>
            {/* Badge */}
            <div className="mb-4 flex w-fit items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1">
              <Brain size={13} className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t('interviewBadge')}
              </span>
            </div>

            <h2
              className="text-4xl font-semibold leading-[1.08] tracking-tighter text-foreground sm:text-5xl md:text-[3rem] md:leading-[1.05]"
              dangerouslySetInnerHTML={{ __html: t.raw('interviewTitle') }}
            />

            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              {t('interviewSubtitle')}
            </p>

            <ul className="mt-8 space-y-3">
              {BULLETS.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon size={13} />
                  </div>
                  <span className="text-sm leading-relaxed text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/interview"
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {t('interviewCtaPrimary')} <ArrowRight size={14} />
              </Link>
              <Link
                href="/chat"
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg neuro-pill px-6 py-3 text-sm font-medium text-foreground transition-shadow active:scale-[0.98]"
              >
                {t('interviewCtaSecondary')}
              </Link>
            </div>
          </div>

          {/* ── Right: Mockup ── */}
          <div className="relative w-full max-w-lg justify-self-end md:pl-12 md:border-l md:border-zinc-300">
            {/* Preppy mascot — peeks from bottom-right (Sentry-style) */}
            <Mascot
              src="/mascot/preppy.webp"
              alt={t('mascotAltInterviewer')}
              size="xs"
              variant="breathe"
              className="pointer-events-none absolute -bottom-6 -right-4 z-20 hidden sm:block drop-shadow-2xl"
            />
            <div className="relative z-10 overflow-hidden rounded-2xl neuro-card">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                <span className="ml-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Brain size={12} className="text-primary" />
                  {t('interviewMockupTitle')}
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* Question counter */}
                <div className="animate-fade-up text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [animation-delay:200ms] [animation-fill-mode:backwards]">
                  {t('interviewQuestionLabel')}
                </div>

                {/* AI question card */}
                <div className="animate-fade-up rounded-lg border border-border bg-muted/20 p-4 [animation-delay:400ms] [animation-fill-mode:backwards]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      AI
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {t('interviewTechnical')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('interviewTags')}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
                    {t('interviewQuestion')}
                  </p>
                </div>

                {/* User answer */}
                <div className="animate-fade-up flex items-start gap-3 justify-end pl-10 [animation-delay:600ms] [animation-fill-mode:backwards]">
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
                    <p className="text-sm leading-relaxed text-foreground">
                      {t('interviewUserAnswer')}
                    </p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    <User size={12} />
                  </div>
                </div>

                {/* AI feedback card */}
                <div className="animate-fade-up rounded-lg neuro-card p-4 [animation-delay:800ms] [animation-fill-mode:backwards]">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        {t('interviewAiScoreFeedback')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 border border-success/15">
                      <span className="text-[10px] font-bold text-success">
                        {t('interviewScore')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <h3 className="text-[10px] font-mono font-semibold uppercase text-success">
                        {t('interviewStrengths')}
                      </h3>
                      <ul className="mt-1.5 space-y-1">
                        {strengths.map((s) => (
                          <li key={s} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <span className="mt-0.5 text-success">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-mono font-semibold uppercase text-warn">
                        {t('interviewImprove')}
                      </h3>
                      <ul className="mt-1.5 space-y-1">
                        {improvements.map((s) => (
                          <li key={s} className="flex items-start gap-1.5 text-sm text-muted-foreground">
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
                  <div className="inline-flex cursor-default items-center gap-1.5 rounded-sm bg-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground">
                    {t('interviewNextQuestion')} <ArrowRight size={12} />
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
