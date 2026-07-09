'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppStoreProvider, useAppStore } from '~/lib/store'
import { Sidebar } from '~/components/layout/sidebar'
import { Topbar } from '~/components/layout/navbar'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem('jfs_auth')
    if (!auth) {
      router.replace('/login')
      return
    }
    setChecked(true)
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="font-mono text-xs text-muted-foreground">Loading…</div>
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
