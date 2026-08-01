'use client'

import { Link } from '~/i18n/routing'
import { ArrowRight, CheckCircle2, FileText, Brain, Mic } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { WiringDiagram } from './wiring-diagram'

export function HeroSection() {
  const t = useTranslations('landing')

  return (
    <section className="relative flex flex-col items-center pt-20 pb-20 w-full max-w-4xl mx-auto px-6">
      <div className="flex flex-col items-center text-center">
        {/* Eyebrow badge */}
        <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-4">
          AI Career Platform
        </span>
        
        {/* H1 Display */}
        <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1.05] text-foreground mb-6">
          {t('title')}
        </h1>
        
        {/* Body Large */}
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          {t('subtitle')}
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-8">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-6 h-12 font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            {t('startChat')} <ArrowRight size={18} />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center border border-border bg-secondary text-foreground rounded-md px-6 h-12 font-semibold hover:border-border-strong active:scale-[0.98] transition-all"
          >
            {t('createAccount')}
          </Link>
        </div>

        {/* Trust text */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-16">
          <CheckCircle2 size={13} className="text-success" />
          {t('heroTrustText')}
        </p>
      </div>

      {/* Wiring motif + Stage cards */}
      <div className="hidden md:block w-full">
        <WiringDiagram variant="horizontal" className="mb-8" />
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: FileText, title: 'Resume Input' },
            { icon: Brain, title: 'AI Match Engine' },
            { icon: Mic, title: 'Interview Ready' },
          ].map((stage, i) => (
            <div key={i} className="border border-border rounded-lg p-6 flex flex-col items-center text-center">
              <stage.icon size={24} className="text-primary mb-4" strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Stage {i + 1}</span>
              <span className="text-sm font-medium text-foreground">{stage.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
