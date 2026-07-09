import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import { ThemeProvider } from '~/components/layout/theme-provider'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
})

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
