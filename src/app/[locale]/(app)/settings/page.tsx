'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '~/lib/auth-client'
import { Loader2, User, Bell, AlertTriangle, Check, X, Eye, EyeOff, LocateFixed, CreditCard } from 'lucide-react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '~/components/layout/theme-provider'

// ── TYPES ──
type Tab = 'profile' | 'notifications' | 'danger' | 'billing'

interface Prefs {
  emailNotifications: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
  homeLocation: string | null
}

function useNotify() {
  const [notif, setNotif] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const notify = useCallback((m: string, t: 'success' | 'error' | 'info' = 'info') => {
    setNotif({ message: m, type: t })
    setTimeout(() => setNotif(null), 4000)
  }, [])
  const dismiss = useCallback(() => setNotif(null), [])
  return { notif, notify, dismiss }
}

function Toast({ notif, onClose }: { notif: NonNullable<ReturnType<typeof useNotify>['notif']>; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-sm border px-4 py-2.5 text-xs shadow-lg animate-fade-up ${
        notif.type === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : notif.type === 'error'
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border bg-card text-foreground'
      }`}
    >
      {notif.type === 'success' && <Check size={13} />}
      {notif.type === 'error' && <X size={13} />}
      <span className="flex-1">{notif.message}</span>
      <button
        onClick={onClose}
        className="ml-2 cursor-pointer text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── MAIN PAGE ──
export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [tab, setTab] = useState<Tab>('profile')
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [homeLocation, setHomeLocation] = useState('')
  const [savingHomeLocation, setSavingHomeLocation] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [loading, setLoading] = useState(true)
  const { notif, notify, dismiss } = useNotify()

  // Profile form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Danger zone state
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Load user & preferences
  useEffect(() => {
    async function load() {
      try {
        const session = await authClient.getSession()
        if (!session.data?.user) {
          router.push('/login')
          return
        }
        const u = session.data.user
        setUser(u)
        setName(u.name)
        setEmail(u.email)
      } catch { /* ignore */ }

      try {
        const res = await fetch('/api/user/preferences')
        if (res.ok) {
          const data = await res.json()
          setPrefs(data)
          setHomeLocation(data.homeLocation || '')
        }
      } catch { /* ignore */ }

      setLoading(false)
    }
    load()
  }, [router])

  // ── HANDLERS ──

  const handleUpdateName = async () => {
    if (!name.trim() || !user) return
    setSavingName(true)
    try {
      await authClient.updateUser({ name: name.trim() })
      notify('Name updated', 'success')
    } catch {
      notify('Failed to update name', 'error')
    }
    setSavingName(false)
  }

  const handleUpdateEmail = async () => {
    if (!email.trim() || !user || email === user.email) return
    setSavingEmail(true)
    try {
      const res = await fetch('/api/user/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        notify('Verification email sent. Check your inbox.', 'success')
      } else {
        const err = await res.json()
        notify(err.error || 'Failed to update email', 'error')
      }
    } catch {
      notify('Failed to update email', 'error')
    }
    setSavingEmail(false)
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notify('Fill in all password fields', 'error')
      return
    }
    if (newPassword.length < 8) {
      notify('New password must be at least 8 characters', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match', 'error')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (error) {
        notify(error.message || 'Failed to change password', 'error')
      } else {
        notify('Password changed', 'success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      notify('Failed to change password', 'error')
    }
    setChangingPassword(false)
  }

  const handleTogglePref = async (key: keyof Prefs) => {
    if (!prefs) return
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        setPrefs(prefs) // revert
        notify('Failed to update preference', 'error')
      }
    } catch {
      setPrefs(prefs) // revert
    }
  }

  const handleSaveHomeLocation = async () => {
    setSavingHomeLocation(true)
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeLocation: homeLocation.trim() || null }),
      })
      if (res.ok) {
        notify('Area saved', 'success')
      } else {
        notify('Failed to save area', 'error')
      }
    } catch {
      notify('Failed to save area', 'error')
    }
    setSavingHomeLocation(false)
  }

  const handleDetectLocation = async () => {
    setDetectingLocation(true)
    try {
      const { detectArea } = await import('~/lib/geo')
      const area = await detectArea()
      setHomeLocation(area)
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeLocation: area }),
      })
      if (res.ok) {
        notify('Location detected: ' + area, 'success')
      }
    } catch {
      notify('Could not detect location. Type your area manually.', 'error')
    }
    setDetectingLocation(false)
  }

  const handleDeleteAccount = async () => {
    if (confirmDelete !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' })
      if (res.ok) {
        await authClient.signOut()
        router.push('/login')
      } else {
        const err = await res.json()
        notify(err.error || 'Failed to delete account', 'error')
      }
    } catch {
      notify('Failed to delete account', 'error')
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="text-xs text-muted-foreground">Manage your account and preferences</div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-0 border-b border-border">
          {(['profile', 'notifications', 'danger', 'billing'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === 'billing') {
                  router.push('/settings/billing')
                  return
                }
                setTab(t)
              }}
              className={`flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'profile' && <User size={13} />}
              {t === 'notifications' && <Bell size={13} />}
              {t === 'danger' && <AlertTriangle size={13} />}
              {t === 'billing' && <CreditCard size={13} />}
              {t === 'profile' && 'Profile'}
              {t === 'notifications' && 'Notifications'}
              {t === 'danger' && 'Danger Zone'}
              {t === 'billing' && 'Billing'}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="space-y-5">
            {/* Name */}
            <div className="rounded-sm border border-border bg-card p-4">
              <div className="mb-3 text-xs font-medium">Display Name</div>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/50"
                  placeholder="Your name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={savingName || name === user?.name}
                  className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingName ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-sm border border-border bg-card p-4">
              <div className="mb-3 text-xs font-medium">Email Address</div>
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/50"
                  placeholder="email@example.com"
                  type="email"
                />
                <button
                  onClick={handleUpdateEmail}
                  disabled={savingEmail || email === user?.email || !email.trim()}
                  className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingEmail ? <Loader2 size={13} className="animate-spin" /> : 'Update'}
                </button>
              </div>
              {email !== user?.email && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  A verification email will be sent to the new address.
                </div>
              )}
            </div>

            {/* My Area */}
            <div className="rounded-sm border border-border bg-card p-4">
              <div className="mb-1 text-xs font-medium">My Area</div>
              <p className="mb-3 text-[10px] text-muted-foreground">
                District or neighborhood is enough — we use this for commute
                directions and living cost estimates. Not your exact address.
              </p>
              <div className="flex gap-2">
                <input
                  value={homeLocation}
                  onChange={(e) => setHomeLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveHomeLocation() }}
                  className="flex-1 rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/50"
                  placeholder="e.g. Bang Na, Bangkok"
                />
                <button
                  onClick={handleSaveHomeLocation}
                  disabled={savingHomeLocation}
                  className="shrink-0 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingHomeLocation ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                </button>
              </div>
              <button
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] text-primary hover:underline disabled:opacity-50"
              >
                {detectingLocation ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                {detectingLocation ? 'Detecting…' : 'Use my current location'}
              </button>
            </div>

            {/* Change Password */}
            <div className="rounded-sm border border-border bg-card p-4">
              <div className="mb-3 text-xs font-medium">Change Password</div>
              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type={showCurrent ? 'text' : 'password'}
                    className="w-full rounded-sm border border-border bg-background px-3 py-1.5 pr-8 text-xs outline-none focus:border-foreground/50"
                    placeholder="Current password"
                  />
                  <button
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNew ? 'text' : 'password'}
                    className="w-full rounded-sm border border-border bg-background px-3 py-1.5 pr-8 text-xs outline-none focus:border-foreground/50"
                    placeholder="New password (min 8 chars)"
                  />
                  <button
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/50"
                  placeholder="Confirm new password"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {changingPassword ? <Loader2 size={13} className="animate-spin" /> : 'Change Password'}
                </button>
              </div>
            </div>

            {/* Account info (read-only) */}
            <div className="rounded-sm border border-border bg-card px-4 py-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Account ID</span>
                <span className="font-mono text-[10px]">{user?.id}</span>
              </div>
            </div>

            {/* Theme */}
            <div className="rounded-sm border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
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
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === 'notifications' && (
          <div className="rounded-sm border border-border bg-card">
            {[
              { key: 'emailNotifications' as keyof Prefs, label: 'Email Notifications', desc: 'Receive emails about resume views, interview invites, and job matches' },
              { key: 'weeklyDigest' as keyof Prefs, label: 'Weekly Digest', desc: 'Get a weekly summary of your application activity and new opportunities' },
              { key: 'marketingEmails' as keyof Prefs, label: 'Marketing Emails', desc: 'Product updates, tips, and career advice' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between border-b border-border/50 px-4 py-3 last:border-b-0">
                <div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </div>
                <button
                  onClick={() => handleTogglePref(item.key)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    prefs?.[item.key] ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      prefs?.[item.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── DANGER ZONE TAB ── */}
        {tab === 'danger' && (
          <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertTriangle size={13} />
              Danger Zone
            </div>
            <div className="mb-4 text-[11px] text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </div>
            <div className="mb-3 text-[11px] font-medium">Type DELETE to confirm</div>
            <div className="flex gap-2">
              <input
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                className="flex-1 rounded-sm border border-red-500/30 bg-background px-3 py-1.5 text-xs outline-none focus:border-red-500/50"
                placeholder="Type DELETE"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={confirmDelete !== 'DELETE' || deleting}
                className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : 'Delete Account'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {notif && <Toast notif={notif} onClose={dismiss} />}
    </div>
  )
}
