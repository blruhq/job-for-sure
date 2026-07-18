'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '~/components/layout/navbar'
import { ThemeToggle } from '~/components/layout/theme-toggle'
import { X, Menu } from 'lucide-react'

export function MarketingNav() {
  const t = useTranslations('landing')
  const [open, setOpen] = useState(false)

  const links = [
    { href: '#how-it-works', label: t('howTitle'), scroll: true },
    { href: '#features', label: t('featuresTitle'), scroll: true },
    { href: '#interview', label: t('interviewBadge'), scroll: true },
    { href: '/pricing', label: 'Pricing', scroll: false },
  ]

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex cursor-pointer items-center gap-2 no-underline">
          <div className="h-3.5 w-3.5 rounded-[3px] bg-primary" />
          <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) =>
            link.scroll ? (
              <a
                key={link.href as string}
                href={link.href as string}
                className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href as string}
                href={link.href as string}
                className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link
            href="/login"
            className="cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('footerSignIn')}
          </Link>
          <Link
            href="/register"
            className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('footerGetStarted')}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="flex cursor-pointer items-center gap-1 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="flex flex-col gap-0 px-6 py-3">
            {links.map((link) =>
              link.scroll ? (
                <a
                  key={link.href as string}
                  href={link.href as string}
                  onClick={() => setOpen(false)}
                  className="cursor-pointer py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href as string}
                  href={link.href as string}
                  onClick={() => setOpen(false)}
                  className="cursor-pointer py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
            <hr className="my-2 border-border" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="cursor-pointer py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('footerSignIn')}
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="cursor-pointer py-2 text-[13px] font-medium text-primary transition-colors hover:text-foreground"
            >
              {t('footerGetStarted')}
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
