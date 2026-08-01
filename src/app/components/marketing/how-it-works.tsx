import { Upload, Search, FileCheck, LayoutDashboard } from 'lucide-react'
import { Link } from '~/i18n/routing'
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
    <section id="how-it-works" className="border-t border-zinc-300 bg-muted/30 py-24 md:py-32">
      <div className="relative overflow-x-clip px-6">
        <div className="relative z-10 max-w-xl">
          <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t('sectionLabelHow')}
          </span>
          <h2 className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
            {t('howTitle')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('howSubtitle')}
          </p>
        </div>
        {/* Resuby mascot removed — mascots now anchor each step below */}
        <div className="relative z-10 mt-20 grid grid-cols-1 border-t border-zinc-300 md:grid-cols-4 md:-mx-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative border-b border-r border-zinc-300 p-6 md:px-8 last:border-r-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well text-primary">
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
        <div className="relative z-10 mt-16">
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
