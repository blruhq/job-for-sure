# Spec: Landing Page Static Rendering + Client JS Reduction

## Goal
Convert landing page (`/en`, `/th`) from Dynamic (ƒ) to Static (○) rendering and eliminate unnecessary client JS pulled in through transitive imports. Target: Lighthouse Performance 90+ mobile / 95+ desktop.

## Out of Scope
- Visual redesign or layout changes
- Non-marketing pages (though root/layout changes affect all pages, no page-specific logic changes outside marketing)
- Font optimization (already done — preload: false on 3 fonts)
- Image optimization (0 KB transfer, already optimized)
- CSS optimization (29 KB, already minimal)
- PostHog (not loaded on marketing page)

---

## Section 1 — Product

### User Stories
- As a mobile user on Slow 4G, the landing page should load and become interactive in under 3s (Lighthouse simulated).
- As a Lighthouse auditor, the landing page should score 90+ Performance on mobile, 95+ on desktop.

### Acceptance Criteria
- [ ] `pnpm build` shows `/[locale]` as `○` (Static) or at minimum the marketing page route is static
- [ ] Client JS bundle for marketing page is reduced (fewer chunks / smaller total)
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] Landing page renders identically (no visual regressions) in both `en` and `th` locales

---

## Section 2 — Engineering Handoff

### Root Cause Analysis

**Why all pages are ƒ (Dynamic):**
1. `src/app/layout.tsx` calls `getLocale()` from `next-intl/server` — this reads from HTTP headers → forces dynamic rendering for the ENTIRE app
2. No `generateStaticParams()` anywhere → Next.js can't pre-render locale variants at build time
3. No `setRequestLocale()` → next-intl falls back to header-based locale detection for all `useTranslations()` calls

**Why client JS is 355 KB (23 chunks):**
1. `marketing-nav.tsx` (client component) imports `LanguageSwitcher` from `navbar.tsx`
2. `navbar.tsx` has NO `'use client'` directive but uses client hooks (`useState`, `useEffect`, `useLocale`, etc.)
3. Since it's imported by a client component, the ENTIRE `navbar.tsx` module becomes client JS
4. This pulls in `Topbar` → `UserMenu` → `authClient` (Better Auth client) → heavy auth SDK
5. The marketing page doesn't need auth at all, but ships the full auth client bundle

---

### Step 1: Extract LanguageSwitcher to Its Own File

**Create**: `src/app/components/layout/language-switcher.tsx`

Move the `LanguageSwitcher` component OUT of `navbar.tsx` into its own file. This breaks the import chain: `marketing-nav.tsx` → `navbar.tsx` → `Topbar` → `UserMenu` → `authClient`.

```tsx
// src/app/components/layout/language-switcher.tsx
'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '~/i18n/routing'
import { Globe } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (nextLocale: 'en' | 'th') => {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-[30px] items-center gap-1 rounded-sm px-1.5 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95 cursor-pointer">
        <Globe size={14} />
        <span className="inline-block w-5 text-center uppercase tabular-nums">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem onClick={() => handleLanguageChange('en')} className="flex items-center justify-between">
          <span>English</span>
          {locale === 'en' && <span className="text-[10px] text-brand font-bold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange('th')} className="flex items-center justify-between">
          <span>ไทย</span>
          {locale === 'th' && <span className="text-[10px] text-brand font-bold">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Update `navbar.tsx`**: Remove the `LanguageSwitcher` function definition (lines 16-43) and the `Globe` import. Add import from the new file:
```tsx
// At top of navbar.tsx, replace inline definition with import:
import { LanguageSwitcher } from '~/components/layout/language-switcher'
```
Remove from navbar.tsx imports: `Globe` from `lucide-react` (no longer used there), `useLocale` from `next-intl` (no longer used there — check Topbar doesn't use it; it doesn't), `useRouter`, `usePathname` from `~/i18n/routing` (no longer used directly — Topbar uses `Link` only). Also remove `DropdownMenu` imports IF Topbar doesn't use them (Topbar doesn't — only LanguageSwitcher did).

**Verify**: After extraction, `navbar.tsx` should NOT import `Globe`, `useLocale`, `useRouter`, `usePathname`, or `DropdownMenu*` — these were only used by `LanguageSwitcher`.

**Update `marketing-nav.tsx`**: Change import:
```tsx
// OLD:
import { LanguageSwitcher } from '~/components/layout/navbar'
// NEW:
import { LanguageSwitcher } from '~/components/layout/language-switcher'
```

---

### Step 2: Move `<html>`/`<body>` from Root Layout to Locale Layout

This eliminates `getLocale()` (which reads headers → forces dynamic rendering) from the root layout.

**Edit `src/app/layout.tsx`** — become a pass-through:
```tsx
import { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
```

Remove ALL imports (fonts, getLocale, globals.css) — they move to `[locale]/layout.tsx`.

**Edit `src/app/[locale]/layout.tsx`** — become the new HTML root:
```tsx
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

// Theme no-flash script (moved from root layout)
const themeNoFlashScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`

// Static rendering: pre-render all locale variants at build time
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  // ... (keep existing viewport definition unchanged)
}

export async function generateMetadata(): Promise<Metadata> {
  // ... (keep existing metadata definition unchanged)
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
              {children}
            </QueryProvider>
            <Toaster position="bottom-center" richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**IMPORTANT**: Keep the existing `viewport` and `generateMetadata` definitions from the current `[locale]/layout.tsx` — do NOT change them. Only adding: font definitions, theme script, `generateStaticParams`, `setRequestLocale`, `<html>`/`<head>`/`<body>` tags.

---

### Step 3: Convert Marketing Page to Static Rendering

**Edit `src/app/[locale]/(marketing)/page.tsx`**:

1. Add imports:
```tsx
import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
```

2. Remove `useTranslations` import (replace with `getTranslations`).

3. Make the page component async and accept `params`:
```tsx
// OLD:
export default function LandingPage() {
  const t = useTranslations('landing')

// NEW:
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')
```

4. Everything else in the page body stays the same — `t('key')` calls work identically with the `getTranslations()` result.

5. Keep `generateMetadata` as-is (already async, already accepts `params`).

**Why `getTranslations` instead of `useTranslations`**: After `await params`, calling a function named `useTranslations` would violate ESLint's rules-of-hooks (conditional hook call after await). `getTranslations` is the async server-side equivalent and is the recommended pattern for async server components.

---

### Step 4: Marketing Components — No Changes Needed

The following components use `useTranslations('landing')` and are server components (no `'use client'`):
- `src/app/components/marketing/how-it-works.tsx`
- `src/app/components/marketing/features-bento.tsx`
- `src/app/components/marketing/interview-section.tsx`

These DO NOT need changes. In next-intl 4.x, `useTranslations()` works in server components with static rendering when `setRequestLocale()` is called in a parent layout/page. Since the marketing page now calls `setRequestLocale(locale)` before rendering these components, the React cache is populated and `useTranslations()` reads from it instead of headers.

**Do NOT convert these to `getTranslations()` or add `'use client'`.** They work as-is.

---

### Target Files Summary

| # | File | Change |
|---|------|--------|
| 1a | `src/app/components/layout/language-switcher.tsx` | **CREATE** — extracted LanguageSwitcher component |
| 1b | `src/app/components/layout/navbar.tsx` | Remove LanguageSwitcher definition + unused imports, import from new file |
| 1c | `src/app/components/marketing/marketing-nav.tsx` | Update import path for LanguageSwitcher |
| 2a | `src/app/layout.tsx` | Reduce to pass-through (remove fonts, `<html>`, `getLocale`) |
| 2b | `src/app/[locale]/layout.tsx` | Add fonts, `<html>`, theme script, `generateStaticParams`, `setRequestLocale` |
| 3 | `src/app/[locale]/(marketing)/page.tsx` | Make async, add `setRequestLocale` + `getTranslations` |

---

### Edge Cases

- **Root layout pass-through**: Next.js requires `<html>` and `<body>` in the rendered output. Since `[locale]/layout.tsx` now provides them, the final HTML is valid. This is the official next-intl recommended pattern.
- **Dynamic pages (chat, dashboard, etc.)**: These use `cookies()`, `headers()`, or other dynamic APIs. `setRequestLocale()` doesn't force them to be static — they'll still be dynamically rendered. The `generateStaticParams()` enables static rendering ONLY for pages that don't use dynamic APIs.
- **Thai locale**: `locale === 'th'` check in `[locale]/layout.tsx` correctly applies Kanit font CSS variable. `generateStaticParams` pre-renders both `en` and `th` at build time.
- **404 for invalid locale**: `notFound()` still called before `setRequestLocale()`. Invalid locales never reach the render phase.
- **Theme no-flash script**: Still runs in `<head>` before hydration. Dark mode users see no white flash.
- **`marketing-nav.tsx` client component**: Still `'use client'` (needed for mobile menu toggle). `useTranslations()` in client components works via `NextIntlClientProvider` which provides messages. No change needed.

---

### Verification Exit Criteria

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm build` succeeds — check `/[locale]` route shows `○` (Static) for at least the marketing page, not `ƒ` (Dynamic) for ALL pages
- [ ] `grep -r "getLocale" src/app/layout.tsx` returns 0 matches (getLocale removed from root layout)
- [ ] `grep "setRequestLocale" src/app/\[locale\]/layout.tsx` returns ≥1 match
- [ ] `grep "generateStaticParams" src/app/\[locale\]/layout.tsx` returns ≥1 match
- [ ] `grep "setRequestLocale" src/app/\[locale\]/\(marketing\)/page.tsx` returns ≥1 match
- [ ] `test -f src/app/components/layout/language-switcher.tsx` — file exists
- [ ] `grep "LanguageSwitcher" src/app/components/layout/navbar.tsx` shows import from new file, NOT inline definition
- [ ] `grep "from '~/components/layout/navbar'" src/app/components/marketing/marketing-nav.tsx` returns 0 matches (import changed to language-switcher)
- [ ] Dev server: navigate to `/en` — page renders correctly, hero section visible, mobile menu works, language switcher works, theme toggle works
- [ ] Dev server: navigate to `/th` — page renders in Thai, Kanit font applied
- [ ] Browser console: zero errors on `/en` landing page load
- [ ] App pages still work: navigate to `/en/chat` (if logged in) — Topbar renders correctly, UserMenu works
