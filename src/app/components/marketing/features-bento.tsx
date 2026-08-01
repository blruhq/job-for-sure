import { MessageSquare, ShieldCheck, KanbanSquare } from 'lucide-react'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Mascot } from '~/components/marketing/mascot'

export function FeaturesBento() {
  const t = useTranslations('landing')

  return (
    <section id="features" className="border-t border-zinc-300 py-24 md:py-32">
      <div className="relative overflow-x-clip px-6">
        <div className="relative z-10 max-w-xl">
          <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t('sectionLabelFeatures')}
          </span>
          <h2 className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
            {t('featuresTitle')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('featuresSubtitle')}
          </p>
        </div>

        {/* Swiss grid — flush cells, no gaps, hairline dividers */}
        <div className="relative z-10 mt-20 grid grid-cols-1 border-t border-l border-zinc-300 md:-mx-6 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
          {/* ── Large cell — AI Chat Coach ── */}
          <div className="row-span-2 flex flex-col border-b border-r border-zinc-300 p-6 md:p-10">
            <div>
              <div className="flex h-10 w-10 items-center justify-center border border-zinc-300 text-primary">
                <MessageSquare size={20} strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-foreground">{t('feature1Title')}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                {t('feature1Desc')}
              </p>
            </div>
            {/* Chat mockup — neumorphism style matching the real app */}
            <div className="mt-8 flex-1 overflow-hidden rounded-xl neuro-card">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  {t('mockupCareerCoach')}
                </span>
              </div>
              <div className="space-y-4 p-5">
                {/* AI message */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    AI
                  </div>
                  <div className="max-w-[85%] rounded-xl bg-muted px-4 py-3">
                    <p
                      className="text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: t.raw('featuresChatMsg1') }}
                    />
                    <p
                      className="mt-2 text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: t.raw('featuresChatMsg2') }}
                    />
                  </div>
                </div>
                {/* User message */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="max-w-[85%] rounded-xl bg-primary/10 px-4 py-3">
                    <p className="text-sm text-foreground">{t('featuresChatUser')}</p>
                  </div>
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10 text-xs font-bold text-muted-foreground">
                    U
                  </div>
                </div>
                {/* AI typing indicator */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t('featuresTryChat')} <ArrowRight size={14} />
            </Link>
          </div>

          {/* ── Small cell — ATS Optimizer ── */}
          <div className="flex flex-col border-b border-r border-zinc-300 p-6 md:p-10">
            <div className="flex h-10 w-10 items-center justify-center border border-zinc-300 text-primary">
              <ShieldCheck size={20} strokeWidth={1.5} />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-foreground">{t('feature2Title')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('feature2Desc')}</p>
            {/* ATS score mockup */}
            <div className="mt-6 rounded-lg neuro-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('featuresMatchScore')}</span>
                <span className="text-2xl font-bold text-primary">84%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[84%] rounded-full bg-primary" />
              </div>
            </div>
          </div>

          {/* ── Small cell — Application Tracker ── */}
          <div className="relative flex flex-col border-b border-r border-zinc-300 p-6 md:p-10">
            <Mascot
              src="/mascot/scrappy.webp"
              alt={t('mascotAltJobSearch')}
              size="step"
              variant="static"
              className="absolute bottom-0 right-0 opacity-95"
            />
            <div className="relative z-10 max-w-[70%]">
              <div className="flex h-10 w-10 items-center justify-center border border-zinc-300 text-primary">
                <KanbanSquare size={20} strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{t('feature3Title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('feature3Desc')}</p>
            </div>
            {/* Tracker mockup */}
            <div className="relative z-10 mt-6 rounded-lg neuro-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 border border-border">
                  <span className="h-2 w-2 rounded-full bg-success/70" />
                  {t('mockupSaved')} (4)
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 border border-border">
                  <span className="h-2 w-2 rounded-full bg-warn/70" />
                  {t('mockupApplied')} (2)
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 border border-border">
                  <span className="h-2 w-2 rounded-full bg-primary/70" />
                  {t('mockupInterviewing')} (1)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
