import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account — theme, LinkedIn import, Chrome extension, and plan.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
