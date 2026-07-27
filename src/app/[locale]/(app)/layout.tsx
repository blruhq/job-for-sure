'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from '~/i18n/routing'
import { useUIStore } from '~/hooks/use-ui'
import { Sidebar } from '~/components/layout/sidebar'
import { Topbar } from '~/components/layout/navbar'
import { Skeleton } from '~/components/ui/skeleton'
import { UpgradeModal } from '~/components/ui/upgrade-modal'
import { authClient } from '~/lib/auth-client'

// Routes an admin is allowed to land on inside (app). Everything else
// bounces them to /admin. (Admins are monitor-only.)
const ADMIN_ALLOWED = new Set(['/admin'])

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  // useSession() caches the session in memory via nanostores — it fetches ONCE
  // on mount and does NOT re-fetch on client navigations within the (app) group.
  const { data: session, isPending } = authClient.useSession()

  // Redirect to login if session is missing after initial load completes.
  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
    }
  }, [isPending, session, router])

  // Role-based routing + PostHog identify.
  // Reads the CACHED session — no network call on navigation.
  useEffect(() => {
    if (isPending || !session) return

    const run = async () => {
      // Identify user in PostHog (with plan for segmentation)
      try {
        const posthog = (await import('posthog-js')).default
        const plan = (session.user as { plan?: string }).plan ?? 'free'
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.name,
          plan,
        })
      } catch {
        // PostHog not loaded yet — skip
      }

      // ── Role-based routing ──
      const stripped = pathname || '/'
      const isAdmin = (session.user as { role?: string }).role === 'admin'

      if (isAdmin && !ADMIN_ALLOWED.has(stripped)) {
        router.replace('/admin')
        return
      }
      if (!isAdmin && stripped === '/admin') {
        router.replace('/chat')
        return
      }
    }

    run()
  }, [session, pathname, router, isPending])

  if (isPending || !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 neuro-surface">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-[3px]" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">Verifying session…</span>
      </div>
    )
  }

  return <>{children}</>
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const closeUpgradeModal = useUIStore((s) => s.closeUpgradeModal)
  const upgradeModalOpen = useUIStore((s) => s.upgradeModal.open)
  const upgradeModalData = useUIStore((s) => s.upgradeModal.data)
  const sidebarOpen = !sidebarCollapsed

  // Lock body scroll while the mobile sidebar overlay is open so the
  // background page can't scroll behind it. Also auto-close sidebar on page change.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      useUIStore.getState().setSidebarCollapsed(true)
    }
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    // Only lock on mobile widths — desktop renders the sidebar in-flow.
    const isMobile = window.matchMedia('(max-width: 1023px)').matches
    if (sidebarOpen && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen flex-col neuro-surface">
      <Topbar />
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar — in flow, toggles between 220px and 56px */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar — slide-in overlay */}
        {!sidebarCollapsed && (
          <>
            <div
              className="fixed inset-0 top-[var(--topbar-height)] z-40 bg-black/40 backdrop-blur-[1px] lg:hidden animate-fade-up"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
            <div
              className="fixed left-0 top-[var(--topbar-height)] bottom-0 z-50 lg:hidden animate-slide-in"
              role="dialog"
              aria-modal="true"
            >
              <Sidebar />
            </div>
          </>
        )}

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">{children}</main>
      </div>

      {/* Global upgrade prompt — triggered by any feature's 402 limit */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={closeUpgradeModal}
        data={upgradeModalData}
      />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
