import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Topnav */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between px-6">
          {/* Brand */}
          <Link href="/" className="flex cursor-pointer items-center gap-2 no-underline">
            <div className="h-3.5 w-3.5 rounded-[3px] bg-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
          </Link>

          {/* Nav links — anchor scroll only */}
          <nav className="flex gap-6 max-md:hidden">
            <a
              href="#features"
              className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              How it Works
            </a>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
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
