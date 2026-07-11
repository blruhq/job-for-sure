import { Upload, Search, FileCheck, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function HowItWorks() {
  const t = useTranslations('landing')

  const STEPS = [
    {
      icon: Upload,
      title: t('step1Title'),
      desc: t('step1Desc'),
    },
    {
      icon: Search,
      title: t('step2Title'),
      desc: t('step2Desc'),
    },
    {
      icon: FileCheck,
      title: t('step3Title'),
      desc: t('step3Desc'),
    },
    {
      icon: LayoutDashboard,
      title: t('step4Title'),
      desc: t('step4Desc'),
    },
  ]

  return (
    <section id="how-it-works" className="border-t border-border bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {t('howTitle')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('howSubtitle')}
          </p>
        </div>
        <div className="mt-20 grid gap-10 md:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-5 top-8 hidden h-px w-10 border-t border-dashed border-border/40 md:block" />
                )}
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-sm">
                  <Icon size={24} />
                </div>
                <div className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('stepLabel')} {i + 1}
                </div>
                <h3 className="mt-3 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-16">
          <Link
            href="/register"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t('howCta')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
