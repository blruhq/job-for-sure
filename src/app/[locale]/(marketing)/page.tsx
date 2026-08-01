import type { Metadata } from 'next'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { GridPattern } from '~/components/marketing/grid-pattern'
import { HowItWorks } from '~/components/marketing/how-it-works'
import { FeaturesBento } from '~/components/marketing/features-bento'
import { InterviewSection } from '~/components/marketing/interview-section'
import { Mascot } from '~/components/marketing/mascot'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { buildAlternates, ogImageUrl, organizationSchema, websiteSchema, faqSchema, JsonLd } from '~/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Job For Sure'
  const description = 'Upload your resume once. Get AI-matched jobs, ATS-optimized resumes, mock interview practice, and a full application tracker.'

  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates(''),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl(title)],
    },
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')

  const statItems = [
    { label: t('mockupKeywords'), value: '14/18', color: 'text-success' },
    { label: t('mockupExperience'), value: '4.2 yrs', color: 'text-primary' },
    { label: t('mockupEducation'), value: 'B.S. CS', color: 'text-warn' },
    { label: t('mockupSkillsGap'), value: '2 items', color: 'text-muted-foreground' },
  ]

  return (
    <main className="flex min-h-screen flex-col neuro-surface">
      <GridPattern>
        {/* ── HERO ── */}
        <section className="relative flex min-h-screen flex-col items-center overflow-x-clip px-4 sm:px-6 pt-[12vh] md:pt-[15vh]">
          <div
            className="pointer-events-none absolute inset-0 hero-glow opacity-[0.04]"
          />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <div className="relative z-10 max-w-lg">
              <span className="mb-4 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
                {t('heroAccentTag')}
              </span>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tighter text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
                {t('title')}
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                {t('subtitle')}
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href="/chat"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {t('startChat')} <ArrowRight size={14} />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex cursor-pointer items-center rounded-lg neuro-pill px-6 py-3 text-sm font-medium text-foreground transition-shadow active:scale-[0.98]"
                >
                  {t('createAccount')}
                </Link>
              </div>
            </div>
            <div className="relative flex flex-col-reverse items-center gap-4 md:flex-row md:justify-end">
              {/* Jobby mascot — peeks from bottom-left of the mockup card (Sentry-style) */}
              <Mascot
                src="/mascot/jobby-hero.webp"
                alt={t('mascotAltHero')}
                size="sm"
                priority
                variant="breathe"
                className="relative md:absolute md:-bottom-8 md:-left-6 z-20 drop-shadow-2xl"
              />
              <div className="relative z-10 w-full max-w-lg">
                <div className="relative overflow-hidden rounded-2xl neuro-card">
                  <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                    <span className="ml-2 text-xs font-medium text-muted-foreground">jobforsure.app</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between animate-fade-up [animation-delay:200ms] [animation-fill-mode:backwards]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('mockupAtsScore')}
                      </span>
                      <span className="font-mono text-2xl font-bold text-primary tabular-nums animate-scale-in [animation-delay:800ms] [animation-fill-mode:backwards]">
                        89
                        <span className="text-sm font-normal text-muted-foreground">%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full w-[89%] rounded-full bg-primary animate-[scale-in_0.6s_var(--ease)_1.2s_both] [transform-origin:left]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {statItems.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg neuro-inset p-2 sm:p-4"
                        >
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className={'text-sm font-semibold ' + stat.color}>{stat.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="animate-fade-up rounded-xl neuro-inset p-3 [animation-delay:2s] [animation-fill-mode:backwards]">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          AI
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {t('mockupCareerCoach')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {t('mockupJustNow')}
                            </span>
                          </div>
                          <div className="mt-1 animate-fade-up overflow-hidden whitespace-normal break-words [animation-delay:2.2s] [animation-fill-mode:backwards]">
                            <span
                              className="inline-block text-sm leading-relaxed text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: t.raw('mockupResumeMatch') }}
                            />
                          </div>
                          <span className="-mt-1 ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground animate-fade-up [animation-delay:2.8s] [animation-fill-mode:backwards]">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {t('mockupSaved')} (4)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                        {t('mockupApplied')} (2)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {t('mockupInterviewing')} (1)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </GridPattern>

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      {/* ── FEATURES (Bento) ── */}
      <FeaturesBento />

      {/* ── INTERVIEW PREP ── */}
      <InterviewSection />

      {/* ── CTA ── */}
      <section className="bg-brand">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-foreground/80">
              {t('sectionLabelCta')}
            </span>
            <h2 className="text-3xl font-bold tracking-tighter text-brand-foreground md:text-4xl">
              {t('tagline')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-foreground/80">
              {t('subtagline')}
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-foreground px-6 py-3 text-sm font-medium text-brand shadow-lg shadow-black/10 transition-all hover:bg-brand-foreground/90 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {t('getStarted')} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-foreground/10 bg-brand px-6 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <span className="text-sm text-brand-foreground/80">{t('footerCopyright')}</span>
          <div className="flex gap-6 text-sm text-brand-foreground/80">
            <Link href="/pricing" className="cursor-pointer transition-colors hover:text-brand-foreground">
              Pricing
            </Link>
            <Link href="/login" className="cursor-pointer transition-colors hover:text-brand-foreground">
              {t('footerSignIn')}
            </Link>
            <Link href="/register" className="cursor-pointer transition-colors hover:text-brand-foreground">
              {t('footerGetStarted')}
            </Link>
          </div>
        </div>
      </footer>

      {/* ── STRUCTURED DATA ── */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={faqSchema([
        {
          question: 'What is Job For Sure?',
          answer: 'Job For Sure is an AI-powered career coach that helps you build resumes, match against job descriptions, prepare for interviews, and track your applications — all in one place.',
        },
        {
          question: 'Is Job For Sure free?',
          answer: 'Yes! The Free plan includes 3 resumes, 15 AI chats per day, 3 cover letters per week, 5 ATS matches per day, and 3 interview prep sessions per week. Upgrade to Pro for unlimited everything at $4/month or $29/year.',
        },
        {
          question: 'How does the ATS resume matcher work?',
          answer: 'Paste a job description and our AI analyzes your resume against it, scoring the match percentage, identifying matched and missing skills, and giving actionable recommendations to improve your chances.',
        },
        {
          question: 'Can I use Job For Sure for non-tech jobs?',
          answer: 'Absolutely. While we have deep tech job board integrations, the resume builder, cover letter generator, ATS matcher, and interview prep work for any industry.',
        },
        {
          question: 'Do you support multiple languages?',
          answer: 'Yes, Job For Sure is available in English and Thai, with more languages coming soon.',
        },
      ])} />
    </main>
  )
}
