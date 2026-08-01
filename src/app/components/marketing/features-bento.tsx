import { MessageSquare, ShieldCheck, KanbanSquare } from 'lucide-react'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Mascot } from '~/components/marketing/mascot'
import { cn } from '~/lib/utils'

export function FeaturesBento() {
  const t = useTranslations('landing')

  const FEATURES = [
    {
      icon: MessageSquare,
      title: t('feature1Title'),
      desc: t('feature1Desc'),
      color: 'text-primary',
      bgAccent: 'bg-primary/5',
      borderAccent: 'border-primary/20',
    },
    {
      icon: ShieldCheck,
      title: t('feature2Title'),
      desc: t('feature2Desc'),
      color: 'text-warn',
      bgAccent: 'bg-warn/5',
      borderAccent: 'border-warn/20',
    },
    {
      icon: KanbanSquare,
      title: t('feature3Title'),
      desc: t('feature3Desc'),
      color: 'text-success',
      bgAccent: 'bg-success/5',
      borderAccent: 'border-success/20',
    },
  ]

  const large = FEATURES[0]
  const smalls = FEATURES.slice(1)

  return (
    <section id="features" className="border-t border-border py-24 md:py-32">
      <div className="relative mx-auto max-w-[1120px] overflow-x-clip px-6">
        <div className="relative z-10 max-w-xl">
          <span className="mb-3 block text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {t('sectionLabelFeatures')}
          </span>
          <h2 className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
            {t('featuresTitle')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('featuresSubtitle')}
          </p>
        </div>

        {/* Scrappy mascot moved inside the job-search bento card (Notion pattern) */}

        <div className="relative z-10 mt-20 grid gap-5 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
          {/* Large card — AI Chat Coach */}
          <div
            className={`${large.bgAccent} ${large.borderAccent} row-span-2 flex flex-col justify-between rounded-lg border p-5 sm:p-8 md:p-10 transition-colors hover:border-border-strong`}
          >
            <div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-md border border-border bg-background ${large.color}`}
              >
                <large.icon size={24} strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-foreground">{large.title}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                {large.desc}
              </p>
            </div>
            {/* Chat mockup — blown up */}
            <div className="mt-8 overflow-hidden rounded-xl neuro-card">
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

          {/* Small cards */}
          {smalls.map((f) => {
            const Icon = f.icon
            const isJobSearch = f.icon === KanbanSquare
            return (
              <div
                key={f.title}
                className={`${f.bgAccent} ${f.borderAccent} relative overflow-hidden flex flex-col justify-between rounded-lg border p-5 sm:p-8 transition-colors hover:border-border-strong`}
              >
                {isJobSearch && (
                  <Mascot
                    src="/mascot/scrappy.webp"
                    alt={t('mascotAltJobSearch')}
                    size="step"
                    variant="static"
                    className="absolute bottom-0 right-0 opacity-95"
                  />
                )}
                <div className={cn('relative z-10', isJobSearch && 'max-w-[70%]')}>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md border border-border bg-background ${f.color}`}
                  >
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                {/* Mini score/tracker mockup */}
                <div className="mt-6 overflow-hidden rounded-md border border-border bg-background p-4">
                  {f.title === t('feature2Title') ? (
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('featuresMatchScore')}</span>
                        <span className="font-bold text-primary tabular-nums">84%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full w-[84%] rounded-full bg-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success/70" />
                        {t('mockupSaved')} (4)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warn/70" />
                        {t('mockupApplied')} (2)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary/70" />
                        {t('mockupInterviewing')} (1)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
