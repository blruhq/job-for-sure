'use client'

import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Image,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { cn } from '~/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Resumes', icon: FileText, href: '/resume' },
  { label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { label: 'Templates', icon: Image, href: '/templates' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-surface transition-all duration-250 flex flex-col relative',
        collapsed ? 'w-[--sidebar-collapsed]' : 'w-[--sidebar-width]',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-[--header-height] border-b border-border px-3',
        collapsed ? 'justify-center' : 'gap-2.5',
      )}>
        <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-[650] text-text-primary">
            Job For Sure
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            activeProps={{ className: 'bg-accent-muted text-accent' }}
            inactiveProps={{ className: 'text-text-secondary hover:bg-hover' }}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-9 mx-2 mb-2 rounded-lg text-text-tertiary hover:bg-hover hover:text-text-secondary transition-colors duration-150"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* User avatar at bottom */}
      <div className={cn(
        'border-t border-border p-3 flex items-center gap-2.5',
        collapsed && 'justify-center',
      )}>
        <div className="h-7 w-7 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
          <span className="text-xs font-[600] text-accent">U</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-body-compact font-[510] text-text-primary truncate">User</p>
            <p className="text-caption text-text-tertiary truncate">Free Plan</p>
          </div>
        )}
      </div>
    </aside>
  )
}