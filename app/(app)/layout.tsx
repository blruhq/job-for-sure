'use client'

import { AppStoreProvider } from '~/lib/store'
import { Sidebar } from '~/components/layout/sidebar'
import { Topbar } from '~/components/layout/navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStoreProvider>
      <div className="flex h-screen flex-col">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </div>
    </AppStoreProvider>
  )
}
