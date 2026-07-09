'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '~/components/layout/sidebar'
import { Navbar } from '~/components/layout/navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  // Restore sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Topbar — brand area integrates with sidebar */}
      <Navbar collapsed={collapsed} onMenuToggle={toggle} />

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main
          className="flex-1 overflow-y-auto p-6 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
