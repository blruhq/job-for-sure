import { ReactNode } from 'react'
import { Inter, JetBrains_Mono, Instrument_Serif, Kanit } from 'next/font/google'
import { getLocale } from 'next-intl/server'
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

const kanit = Kanit({
  variable: '--font-kanit',
  subsets: ['thai', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}${locale === 'th' ? ` ${kanit.variable}` : ''}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
