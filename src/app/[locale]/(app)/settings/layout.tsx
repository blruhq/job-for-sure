import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account — profile, notifications, password, and account deletion.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col overflow-hidden neuro-surface">{children}</div>
}
