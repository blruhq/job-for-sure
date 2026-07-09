import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Topnav */}
      <header className="sticky top-0 z-100 h-16 bg-surface border-b border-border">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between h-full px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline text-inherit">
            <div className="w-4 h-4 bg-accent rounded-[4px]" />
            <span className="font-[600] text-[16px] tracking-[-0.01em]">JOB FOR SURE</span>
          </Link>
          <nav className="flex gap-8 max-md:hidden">
            <Link href="/" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors duration-150 no-underline">
              Product
            </Link>
            <Link href="/dashboard" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors duration-150 no-underline">
              Dashboard
            </Link>
            <Link href="/resume" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors duration-150 no-underline">
              Resumes
            </Link>
            <Link href="/ats" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors duration-150 no-underline">
              ATS Optimizer
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-[6px] border border-border bg-surface px-4 py-2 text-[13px] font-[510] text-text-secondary hover:bg-hover hover:text-text-primary transition-all duration-150 no-underline"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-[6px] bg-accent px-4 py-2 text-[13px] font-[510] text-white hover:bg-accent-hover transition-all duration-150 no-underline"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
