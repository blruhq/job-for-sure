'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppStoreProvider, useAppStore } from '~/lib/store'
import { Sidebar } from '~/components/layout/sidebar'
import { Topbar } from '~/components/layout/navbar'
import { Skeleton } from '~/components/ui/skeleton'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const { authClient } = await import('~/lib/auth-client')
        const { data: session } = await authClient.getSession()
        if (!cancelled) {
          if (session) {
            setChecked(true)
            return
          }
          router.replace('/login')
        }
      } catch {
        // Auth not configured or API unavailable
        if (!cancelled) {
          router.replace('/login')
        }
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
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
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <div className="flex h-screen flex-col">
      <Topbar />
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar — in flow, toggles between 220px and 56px */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar — slide-in overlay */}
        {!sidebarCollapsed && (
          <>
            <div
              className="fixed inset-0 top-[var(--topbar-height)] z-40 bg-black/20 backdrop-blur-[1px] md:hidden animate-fade-up"
              onClick={toggleSidebar}
            />
            <div className="fixed left-0 top-[var(--topbar-height)] bottom-0 z-50 md:hidden animate-slide-in">
              <Sidebar />
            </div>
          </>
        )}

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">{children}</main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStoreProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AppStoreProvider>
  )
}
