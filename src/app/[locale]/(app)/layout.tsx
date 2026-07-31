import type { Metadata } from 'next'
import { AppProvider } from './app-provider'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
