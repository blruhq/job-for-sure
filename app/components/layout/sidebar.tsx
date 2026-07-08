import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Resumes', icon: FileText, href: '/resume' },
  { label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function Sidebar() {
  return (
    <aside className="w-[240px] shrink-0 border-r border-border">
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            activeProps={{ className: 'bg-accent-muted text-accent' }}
            inactiveProps={{ className: 'text-text-secondary hover:bg-hover' }}
            className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-150"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
