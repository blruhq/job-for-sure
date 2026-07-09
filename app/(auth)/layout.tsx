import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in or create your Job For Sure account.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <header className="absolute left-0 right-0 top-0 z-50 flex h-14 items-center px-6">
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </header>
      {children}
    </div>
  )
}
