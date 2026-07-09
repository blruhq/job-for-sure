'use client'

import { Sun, Moon, Linkedin, Chrome, Crown } from 'lucide-react'
import { useTheme } from '~/components/layout/theme-provider'

export default function SettingsPage() {
  const { theme, toggle } = useTheme()

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '640px' }}>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Settings</h1>
        <div className="text-xs text-muted-foreground">Manage your account</div>
      </div>

      {/* General settings */}
      <div className="mb-3 overflow-hidden rounded-sm border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <div className="text-xs font-medium">Theme</div>
            <div className="text-[11px] text-muted-foreground">Light or dark mode</div>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 text-xs hover:bg-background"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            Toggle
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <div className="text-xs font-medium flex items-center gap-1.5">
              <Linkedin size={13} className="text-[#0073b1]" /> LinkedIn Import
            </div>
            <div className="text-[11px] text-muted-foreground">Auto-populate profile</div>
          </div>
          <button className="rounded-sm border border-border bg-background px-3 py-1.5 text-xs hover:bg-background">
            Connect
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs font-medium flex items-center gap-1.5">
              <Chrome size={13} /> Chrome Extension
            </div>
            <div className="text-[11px] text-muted-foreground">Import jobs from any career page</div>
          </div>
          <button className="rounded-sm border border-border bg-background px-3 py-1.5 text-xs hover:bg-background">
            Install
          </button>
        </div>
      </div>

      {/* Plan */}
      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs font-medium flex items-center gap-1.5">
              <Crown size={13} className="text-[var(--warn)]" /> Plan
            </div>
            <div className="text-[11px] text-muted-foreground">Free tier · upgrade for unlimited</div>
          </div>
          <button className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/80">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  )
}
