import type { Metadata } from 'next'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { GridPattern } from '~/components/marketing/grid-pattern'
import { HeroSection } from '~/components/marketing/hero-section'
import { HowItWorks } from '~/components/marketing/how-it-works'
import { FeaturesBento } from '~/components/marketing/features-bento'
import { InterviewSection } from '~/components/marketing/interview-section'
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

  return (
    <main className="flex min-h-screen flex-col neuro-surface">
      <GridPattern>
        {/* ── HERO ── */}
        <HeroSection />
      </GridPattern>

      {/* ── CONTINUOUS GRID CONTAINER ── */}
      <div className="mx-auto max-w-[1120px] border-x border-zinc-300">
        {/* ── HOW IT WORKS ── */}
        <HowItWorks />

        {/* ── FEATURES (Bento) ── */}
        <FeaturesBento />

        {/* ── INTERVIEW PREP ── */}
        <InterviewSection />

        {/* ── CTA ── */}
        <section className="bg-brand border-t border-zinc-300">
          <div className="px-4 py-20 sm:px-6 lg:px-8 md:py-28">
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
      <footer className="border-t border-zinc-300 bg-brand px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
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
      </div>
      {/* ── END CONTINUOUS GRID ── */}

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
