'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
} from 'lucide-react'
import { cn } from '~/lib/utils'

const navSections = [
  {
    label: 'NAVIGATION',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Resumes', icon: FileText, href: '/resume' },
      { label: 'Jobs', icon: Briefcase, href: '/jobs' },
      { label: 'ATS Scanner', icon: Search, href: '/ats' },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-sidebar-bg flex flex-col relative overflow-x-hidden transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
        collapsed ? 'w-[--sidebar-collapsed]' : 'w-[--sidebar-width]',
      )}
    >
      {/* Spacer for topbar brand area */}
      <div className="h-[--header-height]" />

      {/* Navigation */}
      <nav className="flex flex-col flex-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="px-3 pt-5 pb-1">
                <span className="font-mono text-[10px] tracking-[0.06em] text-text-tertiary">
                  {section.label}
                </span>
              </div>
            )}
            <div className="px-1.5">
              {section.items.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px] font-[500] transition-all duration-150 no-underline',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-sidebar-active text-text-primary font-[600]'
                        : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Resume add button */}
      <div className="px-1.5 mb-2">
        <Link
          href="/resume/new"
          className={cn(
            'flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-[500] text-accent hover:bg-accent-muted transition-all duration-150 no-underline',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'New Resume' : undefined}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New Resume</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-9 mx-2 mb-2 rounded-[6px] text-text-tertiary hover:bg-sidebar-hover hover:text-text-secondary transition-colors duration-150"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* User at bottom */}
      <div className={cn(
        'border-t border-border p-3 flex items-center gap-2.5',
        collapsed && 'justify-center',
      )}>
        <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0">
          <span className="text-xs font-[600] text-white">U</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-[600] text-text-primary truncate">User</p>
            <p className="font-mono text-[10px] text-text-tertiary truncate">FREE PLAN</p>
          </div>
        )}
      </div>
    </aside>
  )
}
