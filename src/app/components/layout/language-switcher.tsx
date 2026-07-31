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
