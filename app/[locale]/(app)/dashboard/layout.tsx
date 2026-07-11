import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your job search at a glance — resumes, applications, and interview practice.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
