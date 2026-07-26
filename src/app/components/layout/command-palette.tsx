'use client'

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from '~/i18n/routing'
import {
  Search, MessageSquare, FileText, KanbanSquare, Brain,
  Mail, CheckSquare, Settings, Plus, Briefcase,
} from 'lucide-react'

interface CommandItem {
  label: string
  group: 'Navigation' | 'Actions'
  icon: React.ComponentType<{ size?: number; className?: string }>
  href?: string
  action?: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // ── ⌘K / Ctrl+K listener ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const items: CommandItem[] = [
    { label: 'Career Coach', group: 'Navigation', icon: MessageSquare, href: '/chat' },
    { label: 'My Resumes', group: 'Navigation', icon: FileText, href: '/resumes' },
    { label: 'Applications', group: 'Navigation', icon: KanbanSquare, href: '/applications' },
    { label: 'Interview Prep', group: 'Navigation', icon: Brain, href: '/interview' },
    { label: 'Cover Letter', group: 'Navigation', icon: Mail, href: '/cover-letter' },
    { label: 'ATS Optimizer', group: 'Navigation', icon: CheckSquare, href: '/ats' },
    { label: 'Settings', group: 'Navigation', icon: Settings, href: '/settings' },
    { label: 'New Resume', group: 'Actions', icon: Plus, href: '/resumes' },
    { label: 'Find Jobs', group: 'Actions', icon: Briefcase, href: '/applications' },
  ]

  const navItems = items.filter((i) => i.group === 'Navigation')
  const actionItems = items.filter((i) => i.group === 'Actions')

  const runItem = (item: CommandItem) => {
    setOpen(false)
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href as Parameters<typeof router.push>[0])
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-[200] w-full max-w-xl -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-lg border border-border bg-popover shadow-2xl outline-none focus:outline-none focus:ring-0 focus:border-transparent"
          loop
        >
          <div className="flex items-center border-b border-border px-3 outline-none">
            <Search size={14} className="shrink-0 text-muted-foreground mr-2" />
            <Command.Input
              className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search commands..."
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="mb-1 px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => runItem(item)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent-soft data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground outline-none"
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="mb-1 px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {actionItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => runItem(item)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent-soft data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground outline-none"
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-3 py-2">
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd> select
            </span>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </>
  )
}
