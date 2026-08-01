import { Upload, Search, FileCheck, LayoutDashboard } from 'lucide-react'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { WiringDiagram } from './wiring-diagram'

export function HowItWorks() {
  const t = useTranslations('landing')

  const STEPS = [
    { icon: Upload, title: t('step1Title'), desc: t('step1Desc') },
    { icon: Search, title: t('step2Title'), desc: t('step2Desc') },
    { icon: FileCheck, title: t('step3Title'), desc: t('step3Desc') },
    { icon: LayoutDashboard, title: t('step4Title'), desc: t('step4Desc') },
  ]

  return (
    <section id="how-it-works" className="border-t border-border bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl mb-16">
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {t('sectionLabelHow')}
          </span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
            {t('howTitle')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('howSubtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative border border-border rounded-lg p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary border border-border mb-6">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                
                {/* Wiring bridge between steps */}
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-24 hidden md:block z-10">
                    <WiringDiagram variant="bridge" />
                  </div>
                )}

                <div className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-3">
                  {t('stepLabel')} {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {t('howCta')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
