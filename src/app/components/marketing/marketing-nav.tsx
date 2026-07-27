'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '~/components/layout/navbar'
import { ThemeToggle } from '~/components/layout/theme-toggle'
import { X, Menu } from 'lucide-react'
import Image from 'next/image'
import { Button } from '~/components/ui/button'
import { BRAND_LOGO_SRC } from '~/lib/constants'

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
    <header className="sticky top-0 z-50 h-14 border-b border-border neuro-surface">
      <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between px-6">
        {/* Brand — logo lives in the navbar, not the hero */}
        <Link href="/" className="flex cursor-pointer items-center gap-2 no-underline">
          <div className="neuro-icon-well rounded-[3px] p-0.5">
            <Image
              src={BRAND_LOGO_SRC}
              alt="Job For Sure"
              width={24}
              height={24}
              className="shrink-0"
              priority
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) =>
            link.scroll ? (
              <a
                key={link.href as string}
                href={link.href as string}
                className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href as string}
                href={link.href as string}
                className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('footerSignIn')}
          </Link>
          <Link
            href="/register"
            className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('footerGetStarted')}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border neuro-surface md:hidden">
          <div className="flex flex-col gap-0 px-6 py-3">
            {links.map((link) =>
              link.scroll ? (
                <a
                  key={link.href as string}
                  href={link.href as string}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] cursor-pointer items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href as string}
                  href={link.href as string}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] cursor-pointer items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
            <hr className="my-2 border-border" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] cursor-pointer items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('footerSignIn')}
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-primary transition-colors hover:text-foreground"
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
