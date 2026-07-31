import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '~/components/layout/theme-provider'
import '../globals.css'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '~/i18n/routing'
import { QueryProvider } from '~/components/layout/query-provider'
import { SITE_URL, buildAlternates, ogImageUrl } from '~/lib/seo'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Job For Sure — AI Career Coach'
  const description = 'Your AI career coach — chat, match, tailor, and track every application. Upload your resume and get matched against top companies.'

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: '%s · Job For Sure',
    },
    description,
    keywords: ['career coach', 'resume builder', 'ATS optimizer', 'job search', 'AI resume', 'job pipeline', 'interview prep'],
    authors: [{ name: 'Job For Sure' }],
    alternates: buildAlternates(''),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      url: SITE_URL,
      siteName: 'Job For Sure',
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl(title)],
    },
    icons: {
      icon: '/favicon.ico',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster position="bottom-center" richColors />
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
