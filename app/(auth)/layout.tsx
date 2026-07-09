import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in or create your Job For Sure account.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
