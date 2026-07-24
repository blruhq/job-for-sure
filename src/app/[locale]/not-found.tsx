import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center neuro-surface px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well">
          <span className="text-2xl font-bold text-muted-foreground/40">404</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Go home
          </Link>
          <Link
            href="/chat"
            className="cursor-pointer rounded-md neuro-pill px-4 py-2 text-xs font-medium text-foreground transition-shadow"
          >
            Career Coach
          </Link>
        </div>
      </div>
    </div>
  )
}
