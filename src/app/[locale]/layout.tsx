import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Instrument_Serif, Kanit } from 'next/font/google'
import { ThemeProvider } from '~/components/layout/theme-provider'
import '../globals.css'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '~/i18n/routing'
import { QueryProvider } from '~/components/layout/query-provider'
import { ReactScan } from '~/components/dev/react-scan'
import { SITE_URL, buildAlternates, ogImageUrl } from '~/lib/seo'

// Font definitions (moved from root layout)
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
})

const kanit = Kanit({
  variable: '--font-kanit',
  subsets: ['thai', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
})

// Inline script that runs BEFORE hydration to apply the saved theme.
// Prevents the white-flash dark-mode users see when ThemeProvider mounts.
// Must be a string — Next.js will render it verbatim inside <head>.
const themeNoFlashScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`

// Static rendering: pre-render all locale variants at build time
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

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

  // Enable static rendering for this locale
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}${locale === 'th' ? ` ${kanit.variable}` : ''}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <QueryProvider>
              <ReactScan />
              {children}
            </QueryProvider>
            <Toaster position="bottom-center" richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
