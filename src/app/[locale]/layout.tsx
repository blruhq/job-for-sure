import type { Metadata } from 'next'
import { ThemeProvider } from '~/components/layout/theme-provider'
import '../globals.css'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '~/i18n/routing'

export const metadata: Metadata = {
  metadataBase: new URL('https://jobforsure.app'),
  title: {
    default: 'Job For Sure — AI Career Coach',
    template: '%s · Job For Sure',
  },
  description: 'Your AI career coach — chat, match, tailor, and track every application. Upload your resume and get matched against top companies.',
  keywords: ['career coach', 'resume builder', 'ATS optimizer', 'job search', 'AI resume', 'job pipeline', 'interview prep'],
  authors: [{ name: 'Job For Sure' }],
  openGraph: {
    title: 'Job For Sure — AI Career Coach',
    description: 'Chat with AI to match your resume against top companies, tailor for job descriptions, and track every application.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Job For Sure',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job For Sure — AI Career Coach',
    description: 'Chat with AI to match your resume, tailor for jobs, and track applications.',
  },
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        {children}
        <Toaster position="bottom-center" richColors />
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
