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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

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
        {children}
      </body>
    </html>
  )
}
